import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import {TrainDailyAggregateEntity} from './entities/train-daily-aggregate.entity';
import {TrainStopEventEntity} from './entities/train-stop-event.entity';

interface AggregateBucket {
  serviceDate: string;
  trainId: string;
  stopEventsCount: number;
  delaySumSeconds: number;
  maxDelaySeconds: number;
  anomalyEventsCount: number;
  metrics: Record<string, unknown>;
}

@Injectable()
export class TrainAggregateService implements OnModuleInit, OnModuleDestroy {
  @InjectRepository(TrainDailyAggregateEntity)
  private readonly aggregateRepository!: Repository<TrainDailyAggregateEntity>;

  @InjectRepository(TrainStopEventEntity)
  private readonly stopEventRepository!: Repository<TrainStopEventEntity>;

  private timer: NodeJS.Timeout | null = null;

  onModuleInit(): void {
    this.scheduleNextRun();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async refreshRecentAggregates(daysBack = 2): Promise<number> {
    const dates = this.getRecentServiceDates(daysBack);
    if (dates.length === 0) {
      return 0;
    }

    await this.aggregateRepository.delete({
      serviceDate: In(dates),
    });

    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const events = await this.stopEventRepository
      .createQueryBuilder('event')
      .where('event.occurredAt >= :startDate', { startDate })
      .andWhere('event.occurredAt < :endDate', { endDate })
      .getMany();

    const buckets = this.groupEvents(events, dates);
    const aggregates = Array.from(buckets.values()).map((bucket) =>
      this.aggregateRepository.create({
        serviceDate: bucket.serviceDate,
        trainId: bucket.trainId,
        stopEventsCount: bucket.stopEventsCount,
        avgDelaySeconds: bucket.stopEventsCount > 0 ? Math.round(bucket.delaySumSeconds / bucket.stopEventsCount) : 0,
        maxDelaySeconds: bucket.maxDelaySeconds,
        anomalyEventsCount: bucket.anomalyEventsCount,
        metrics: bucket.metrics,
      }),
    );

    if (aggregates.length > 0) {
      await this.aggregateRepository.save(aggregates);
    }

    return aggregates.length;
  }

  private scheduleNextRun(): void {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(0, 10, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();
    this.timer = setTimeout(async () => {
      try {
        await this.refreshRecentAggregates(2);
      } finally {
        this.scheduleNextRun();
      }
    }, delay);
  }

  private getRecentServiceDates(daysBack: number): string[] {
    const dates: string[] = [];
    for (let i = daysBack - 1; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(this.toServiceDate(date));
    }
    return dates;
  }

  private groupEvents(events: TrainStopEventEntity[], allowedDates: string[]): Map<string, AggregateBucket> {
    const buckets = new Map<string, AggregateBucket>();

    for (const event of events) {
      const serviceDate = this.toServiceDate(event.occurredAt);
      if (!allowedDates.includes(serviceDate)) {
        continue;
      }

      const key = `${serviceDate}:${event.trainId}`;
      const bucket = buckets.get(key) ?? {
        serviceDate,
        trainId: event.trainId,
        stopEventsCount: 0,
        delaySumSeconds: 0,
        maxDelaySeconds: 0,
        anomalyEventsCount: 0,
        metrics: {
          eventTypes: {},
          sources: {},
        },
      };

      bucket.stopEventsCount += 1;
      const delaySeconds = event.delaySeconds ?? 0;
      bucket.delaySumSeconds += delaySeconds;
      bucket.maxDelaySeconds = Math.max(bucket.maxDelaySeconds, delaySeconds);
      if (Math.abs(delaySeconds) >= 900) {
        bucket.anomalyEventsCount += 1;
      }

      const eventTypes = bucket.metrics.eventTypes as Record<string, number>;
      const sources = bucket.metrics.sources as Record<string, number>;
      eventTypes[event.eventType] = (eventTypes[event.eventType] ?? 0) + 1;
      sources[event.source] = (sources[event.source] ?? 0) + 1;
      bucket.metrics.lastEventAt = event.occurredAt.toISOString();

      buckets.set(key, bucket);
    }

    return buckets;
  }

  private toServiceDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
    const month = parts.find((part) => part.type === 'month')?.value ?? '00';
    const day = parts.find((part) => part.type === 'day')?.value ?? '00';
    return `${year}-${month}-${day}`;
  }
}
