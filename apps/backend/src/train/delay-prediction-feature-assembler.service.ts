import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Between, Repository} from 'typeorm';
import {TrainDailyAggregateEntity} from './entities/train-daily-aggregate.entity';
import {RouteDailyAggregateEntity} from '../route/entities/route-daily-aggregate.entity';
import {StationDailyAggregateEntity} from '../station/entities/station-daily-aggregate.entity';
import {AlertClassifierService} from '../incident/alert-classifier.service';
import {IncidentSeverity} from '@train-system/shared-types';
import {DelayPredictionRequestDto} from './dto/delay-prediction-request.dto';

interface PredictionContext {
  trainId?: string;
  routeId?: string;
  stationId?: string;
  referenceDate?: Date;
}

@Injectable()
export class DelayPredictionFeatureAssemblerService {
  constructor(
    @InjectRepository(TrainDailyAggregateEntity)
    private readonly trainAggRepo: Repository<TrainDailyAggregateEntity>,
    @InjectRepository(RouteDailyAggregateEntity)
    private readonly routeAggRepo: Repository<RouteDailyAggregateEntity>,
    @InjectRepository(StationDailyAggregateEntity)
    private readonly stationAggRepo: Repository<StationDailyAggregateEntity>,
    private readonly incidentClassifier: AlertClassifierService,
  ) {}

  /**
   * Assembles a delay prediction feature vector from historical aggregates and active incidents.
   *
   * @param context - The train, route, station, and reference date context.
   * @returns A DTO ready to be sent to the predictor service.
   */
  async assemble(context: PredictionContext): Promise<DelayPredictionRequestDto> {
    const referenceDate = context.referenceDate ?? new Date();
    const {startDate, endDate} = this.last7DaysRange(referenceDate);

    const [trainAggs, routeAggs, stationAggs] = await Promise.all([
      context.trainId
        ? this.trainAggRepo.find({
            where: {trainId: context.trainId, serviceDate: Between(startDate, endDate)},
          })
        : Promise.resolve([]),
      context.routeId
        ? this.routeAggRepo.find({
            where: {routeId: context.routeId, serviceDate: Between(startDate, endDate)},
          })
        : Promise.resolve([]),
      context.stationId
        ? this.stationAggRepo.find({
            where: {stationId: context.stationId, serviceDate: Between(startDate, endDate)},
          })
        : Promise.resolve([]),
    ]);

    const aggregates = [...trainAggs, ...routeAggs, ...stationAggs];

    const avgDelaySeconds7d = this.average(aggregates.map((a) => a.avgDelaySeconds));
    const maxDelaySeconds7d = aggregates.length > 0 ? Math.max(...aggregates.map((a) => a.maxDelaySeconds)) : 0;
    const anomalyEvents7d = aggregates.reduce(
      (sum, a) => sum + ('anomalyEventsCount' in a ? (a.anomalyEventsCount ?? 0) : 0),
      0,
    );

    const activeIncidents = await this.activeIncidents(context);
    const activeIncidentSeverity = this.maxIncidentSeverity(activeIncidents);

    return {
      trainId: context.trainId ?? null,
      routeId: context.routeId ?? null,
      stationId: context.stationId ?? null,
      hourOfDay: referenceDate.getHours(),
      dayOfWeek: referenceDate.getDay(),
      avgDelaySeconds7d,
      maxDelaySeconds7d,
      anomalyEvents7d,
      activeIncidentSeverity,
    };
  }

  /**
   * Loads active incidents that match any of the provided context dimensions.
   *
   * @param context - The prediction context.
   * @returns A flattened list of active incidents.
   */
  private async activeIncidents(context: PredictionContext) {
    const incidents = await Promise.all([
      context.trainId ? this.incidentClassifier.getActiveIncidentsForTrain(context.trainId) : Promise.resolve([]),
      context.routeId ? this.incidentClassifier.getActiveIncidentsForRoute(context.routeId) : Promise.resolve([]),
      context.stationId ? this.incidentClassifier.getActiveIncidentsForStation(context.stationId) : Promise.resolve([]),
    ]);
    return incidents.flat();
  }

  /**
   * Returns the highest severity rank among a list of incidents.
   *
   * @param incidents - The incidents to evaluate.
   * @returns A numeric rank where 0 means no incidents and higher is more severe.
   */
  private maxIncidentSeverity(incidents: {severity: IncidentSeverity | null}[]): number {
    const severityRank: Record<IncidentSeverity, number> = {
      [IncidentSeverity.INFO]: 1,
      [IncidentSeverity.LOW]: 1,
      [IncidentSeverity.MEDIUM]: 2,
      [IncidentSeverity.HIGH]: 3,
      [IncidentSeverity.CRITICAL]: 4,
    };

    if (incidents.length === 0) {
      return 0;
    }

    return Math.max(...incidents.map((i) => (i.severity ? severityRank[i.severity] : 0)));
  }

  /**
   * Computes the rounded average of a list of numbers.
   *
   * @param values - The values to average.
   * @returns The rounded average, or 0 for an empty list.
   */
  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Builds a 7-day service date range ending on the reference date.
   *
   * @param referenceDate - The inclusive end of the range.
   * @returns An object with `startDate` and `endDate` in `YYYY-MM-DD` format.
   */
  private last7DaysRange(referenceDate: Date): {startDate: string; endDate: string} {
    const end = new Date(referenceDate);
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    return {
      startDate: this.toServiceDate(start),
      endDate: this.toServiceDate(end),
    };
  }

  /**
   * Converts a UTC date to a Madrid-local service date string.
   *
   * @param date - The date to convert.
   * @returns The date in `YYYY-MM-DD` format according to Europe/Madrid.
   */
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
