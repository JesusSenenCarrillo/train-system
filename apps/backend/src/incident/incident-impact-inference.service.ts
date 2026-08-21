import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import {TrainStopEventEntity} from '../train/entities/train-stop-event.entity';
import {RouteEntity} from '../route/entities/route.entity';

export interface IncidentImpactInferenceResult {
  affectedTrainIds: string[];
  affectedStationIds: string[];
  primaryTrainId: string | null;
  primaryStationId: string | null;
}

@Injectable()
export class IncidentImpactInferenceService {
  @InjectRepository(TrainStopEventEntity)
  private readonly stopEventRepository!: Repository<TrainStopEventEntity>;

  @InjectRepository(RouteEntity)
  private readonly routeRepository!: Repository<RouteEntity>;

  /**
   * Infers impacted trains and stations from route ids and known stops.
   *
   * Uses recent stop events (`routeId`) and inferred/static route records (`tripId`, `routeKey`)
   * so GTFS alert route identifiers can be translated into operational train/station ids.
   *
   * @param input - Route and stop context from an incident.
   * @returns Expanded impact metadata and backward-compatible primary ids.
   */
  async infer(input: {
    routeIds: string[];
    stopIds: string[];
    trainId?: string | null;
    stationId?: string | null;
  }): Promise<IncidentImpactInferenceResult> {
    const trainSet = new Set<string>();
    const stationSet = new Set<string>();

    this.addIfPresent(trainSet, input.trainId);
    this.addIfPresent(stationSet, input.stationId);
    input.stopIds.forEach((stopId) => this.addIfPresent(stationSet, stopId));

    if (input.routeIds.length > 0) {
      const [eventsByRoute, eventsByTrip, routes] = await Promise.all([
        this.stopEventRepository.find({
          select: { trainId: true, stationId: true },
          where: { routeId: In(input.routeIds) },
          order: { occurredAt: 'DESC' },
          take: 1000,
        }),
        this.stopEventRepository.find({
          select: { trainId: true, stationId: true },
          where: { tripId: In(input.routeIds) },
          order: { occurredAt: 'DESC' },
          take: 1000,
        }),
        this.routeRepository.find({
          where: [{ tripId: In(input.routeIds) }, { routeKey: In(input.routeIds) }],
          take: 500,
        }),
      ]);

      for (const event of [...eventsByRoute, ...eventsByTrip]) {
        this.addIfPresent(trainSet, event.trainId);
        this.addIfPresent(stationSet, event.stationId);
      }

      for (const route of routes) {
        this.addIfPresent(trainSet, route.trainId);
        this.addIfPresent(stationSet, route.originStationId);
        this.addIfPresent(stationSet, route.destinationStationId);
        route.pathStationIds.forEach((stationId) => this.addIfPresent(stationSet, stationId));
      }
    }

    const affectedTrainIds = Array.from(trainSet).sort((a, b) => a.localeCompare(b));
    const affectedStationIds = Array.from(stationSet).sort((a, b) => a.localeCompare(b));

    return {
      affectedTrainIds,
      affectedStationIds,
      primaryTrainId: input.trainId ?? affectedTrainIds[0] ?? null,
      primaryStationId: input.stationId ?? affectedStationIds[0] ?? null,
    };
  }

  private addIfPresent(target: Set<string>, value: string | null | undefined): void {
    if (!value) {
      return;
    }
    target.add(value);
  }
}
