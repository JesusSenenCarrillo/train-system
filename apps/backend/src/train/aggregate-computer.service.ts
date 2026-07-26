import {Injectable, Logger} from '@nestjs/common';
import {Cron} from '@nestjs/schedule';
import {InjectRepository} from '@nestjs/typeorm';
import {Between, Repository} from 'typeorm';
import {TrainStopEventEntity} from './entities/train-stop-event.entity';
import {TrainDailyAggregateEntity} from './entities/train-daily-aggregate.entity';
import {StationDailyAggregateEntity} from '../station/entities/station-daily-aggregate.entity';
import {RouteDailyAggregateEntity} from '../route/entities/route-daily-aggregate.entity';

interface EventMetrics {
  eventTypes: Record<string, number>;
  sources: Record<string, number>;
  delayBuckets: {onTime: number; minor: number; moderate: number; severe: number};
  stationIds: string[];
  trainIds: string[];
  tripIds: string[];
}

@Injectable()
export class AggregateComputerService {
    private readonly logger = new Logger(AggregateComputerService.name);

    constructor(
        @InjectRepository(TrainStopEventEntity)
        private readonly stopEventRepo: Repository<TrainStopEventEntity>,
        @InjectRepository(TrainDailyAggregateEntity)
        private readonly trainAggRepo: Repository<TrainDailyAggregateEntity>,
        @InjectRepository(StationDailyAggregateEntity)
        private readonly stationAggRepo: Repository<StationDailyAggregateEntity>,
        @InjectRepository(RouteDailyAggregateEntity)
        private readonly routeAggRepo: Repository<RouteDailyAggregateEntity>,
    ) {}

    /**
     * Computes daily aggregates for the previous calendar day.
     *
     * Runs automatically at 03:00 every day.
     */
    @Cron('0 3 * * *') // 3 AM daily
    async computeDailyAggregates(): Promise<void> {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        this.logger.log(`Computing aggregates for ${dateStr}`);

        await this.computeTrainAggregates(dateStr, yesterday);
        await this.computeStationAggregates(dateStr, yesterday);
        await this.computeRouteAggregates(dateStr, yesterday);
    }

    /**
     * Computes per-train aggregates for a single service date.
     *
     * @param dateStr - The service date as `YYYY-MM-DD`.
     * @param date - The service date as a Date object.
     */
    private async computeTrainAggregates(dateStr: string, date: Date): Promise<void> {
        const events = await this.fetchEventsForDate(date);
        const byTrain = this.groupBy(events, (e) => e.trainId);

        for (const [trainId, trainEvents] of byTrain) {
            const delays = trainEvents.map((e) => e.delaySeconds ?? 0).filter((d) => d > 0);
            const anomalies = trainEvents.filter((e) => (e.delaySeconds ?? 0) > 300).length;
            const metrics = this.buildMetrics(trainEvents, {includeStationIds: true, includeTrainIds: false});
            const rollingMetrics = await this.computeRollingMetrics(trainId, date);

            const agg = this.trainAggRepo.create({
                serviceDate: dateStr,
                trainId,
                stopEventsCount: trainEvents.length,
                avgDelaySeconds: delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0,
                maxDelaySeconds: delays.length > 0 ? Math.max(...delays) : 0,
                anomalyEventsCount: anomalies,
                metrics: {
                    ...metrics,
                    ...rollingMetrics,
                    onTimeRate: delays.length > 0 ? 1 - (anomalies / delays.length) : 1,
                    delayVariance: this.variance(delays),
                },
            });

            await this.trainAggRepo.save(agg);
        }
    }

    /**
     * Computes per-station aggregates for a single service date.
     *
     * @param dateStr - The service date as `YYYY-MM-DD`.
     * @param date - The service date as a Date object.
     */
    private async computeStationAggregates(dateStr: string, date: Date): Promise<void> {
        const events = await this.fetchEventsForDate(date);
        const byStation = this.groupBy(events, (e) => e.stationId);

        for (const [stationId, stationEvents] of byStation) {
            const delays = stationEvents.map((e) => e.delaySeconds ?? 0).filter((d) => d > 0);
            const metrics = this.buildMetrics(stationEvents, {includeStationIds: false, includeTrainIds: true});

            const agg = this.stationAggRepo.create({
                serviceDate: dateStr,
                stationId,
                stopEventsCount: stationEvents.length,
                avgDelaySeconds: delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0,
                maxDelaySeconds: delays.length > 0 ? Math.max(...delays) : 0,
                arrivalCount: stationEvents.filter((e) => e.eventType === 'ARRIVAL').length,
                departureCount: stationEvents.filter((e) => e.eventType === 'DEPARTURE').length,
                metrics: {
                    ...metrics,
                    delayVariance: this.variance(delays),
                    peakHourAvgDelay: this.peakHourAvg(stationEvents),
                },
            });

            await this.stationAggRepo.save(agg);
        }
    }

    /**
     * Computes per-route aggregates for a single service date.
     *
     * @param dateStr - The service date as `YYYY-MM-DD`.
     * @param date - The service date as a Date object.
     */
    private async computeRouteAggregates(dateStr: string, date: Date): Promise<void> {
        const events = await this.fetchEventsForDate(date);
        const byRoute = this.groupBy(events, (e) => e.routeId ?? 'unknown');

        for (const [routeId, routeEvents] of byRoute) {
            const delays = routeEvents.map((e) => e.delaySeconds ?? 0).filter((d) => d > 0);
            const anomalies = routeEvents.filter((e) => (e.delaySeconds ?? 0) > 300).length;
            const metrics = this.buildMetrics(routeEvents, {includeStationIds: true, includeTrainIds: true});

            const agg = this.routeAggRepo.create({
                serviceDate: dateStr,
                routeId,
                stopEventsCount: routeEvents.length,
                avgDelaySeconds: delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0,
                maxDelaySeconds: delays.length > 0 ? Math.max(...delays) : 0,
                anomalyEventsCount: anomalies,
                metrics: {
                    ...metrics,
                    onTimeRate: delays.length > 0 ? 1 - (anomalies / delays.length) : 1,
                    delayVariance: this.variance(delays),
                },
            });

            await this.routeAggRepo.save(agg);
        }
    }

    /**
     * Loads all stop events that occurred during a given calendar day.
     *
     * @param date - The day to query.
     * @returns The matching stop events ordered by occurrence time.
     */
    private async fetchEventsForDate(date: Date): Promise<TrainStopEventEntity[]> {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        return this.stopEventRepo.find({
            where: {occurredAt: Between(start, end)},
            order: {occurredAt: 'ASC'},
        });
    }

    /**
     * Groups stop events by an arbitrary key function.
     *
     * @param events - The events to group.
     * @param keyFn - Function that extracts the group key from an event.
     * @returns A map from key to the events belonging to that group.
     */
    private groupBy<T>(events: TrainStopEventEntity[], keyFn: (e: TrainStopEventEntity) => T): Map<T, TrainStopEventEntity[]> {
        const groups = new Map<T, TrainStopEventEntity[]>();
        for (const e of events) {
            const key = keyFn(e);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(e);
        }
        return groups;
    }

    /**
     * Builds a metrics object counting event types, sources, delay buckets, and ids.
     *
     * @param events - The stop events to analyze.
     * @param options - Flags controlling whether station and train ids are collected.
     * @returns The populated metrics object.
     */
    private buildMetrics(
        events: TrainStopEventEntity[],
        options: {includeStationIds: boolean; includeTrainIds: boolean},
    ): EventMetrics {
        const metrics: EventMetrics = {
            eventTypes: {},
            sources: {},
            delayBuckets: {onTime: 0, minor: 0, moderate: 0, severe: 0},
            stationIds: [],
            trainIds: [],
            tripIds: [],
        };

        for (const e of events) {
            metrics.eventTypes[e.eventType] = (metrics.eventTypes[e.eventType] ?? 0) + 1;
            metrics.sources[e.source] = (metrics.sources[e.source] ?? 0) + 1;

            const delayMinutes = Math.abs(e.delaySeconds ?? 0) / 60;
            if (delayMinutes < 5) {
                metrics.delayBuckets.onTime += 1;
            } else if (delayMinutes < 15) {
                metrics.delayBuckets.minor += 1;
            } else if (delayMinutes < 30) {
                metrics.delayBuckets.moderate += 1;
            } else {
                metrics.delayBuckets.severe += 1;
            }

            if (options.includeStationIds && !metrics.stationIds.includes(e.stationId)) {
                metrics.stationIds.push(e.stationId);
            }
            if (options.includeTrainIds && !metrics.trainIds.includes(e.trainId)) {
                metrics.trainIds.push(e.trainId);
            }
            if (e.tripId && !metrics.tripIds.includes(e.tripId)) {
                metrics.tripIds.push(e.tripId);
            }
        }

        return metrics;
    }

    /**
     * Computes rolling 7-day average and maximum delay for a train up to a given date.
     *
     * @param trainId - The train to analyze.
     * @param upTo - The inclusive end date of the rolling window.
     * @returns An object with `rolling7dAvgDelay` and `rolling7dMaxDelay`.
     */
    private async computeRollingMetrics(trainId: string, upTo: Date): Promise<Record<string, number>> {
        const sevenDaysAgo = new Date(upTo);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const aggs = await this.trainAggRepo.find({
            where: {
                trainId,
                serviceDate: Between(sevenDaysAgo.toISOString().split('T')[0], upTo.toISOString().split('T')[0]),
            },
        });

        if (aggs.length === 0) return {rolling7dAvgDelay: 0, rolling7dMaxDelay: 0};

        const avgDelays = aggs.map((a) => a.avgDelaySeconds);
        return {
            rolling7dAvgDelay: Math.round(avgDelays.reduce((a, b) => a + b, 0) / avgDelays.length),
            rolling7dMaxDelay: Math.max(...aggs.map((a) => a.maxDelaySeconds)),
        };
    }

    /**
     * Computes the population variance of a list of numbers.
     *
     * @param values - The values to analyze.
     * @returns The variance, or 0 if fewer than two values are provided.
     */
    private variance(values: number[]): number {
        if (values.length < 2) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return Math.round(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
    }

    /**
     * Computes the average delay during morning and evening peak hours (07-09, 17-19).
     *
     * @param events - The stop events to analyze.
     * @returns The average delay in seconds during peak hours, or 0 if none.
     */
    private peakHourAvg(events: TrainStopEventEntity[]): number {
        const peak = events.filter((e) => {
            const h = e.occurredAt.getHours();
            return [7, 8, 9, 17, 18, 19].includes(h);
        });
        const delays = peak.map((e) => e.delaySeconds ?? 0).filter((d) => d > 0);
        return delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;
    }
}