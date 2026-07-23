import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Route} from '@train-system/shared-types';
import {Repository} from 'typeorm';
import {InferredRouteEntity} from './entities/inferred-route.entity';

export interface UpsertRouteDto {
  routeKey: string;
  trainId?: string | null;
  tripId?: string | null;
  originStationId: string;
  destinationStationId: string;
  pathStationIds: string[];
  durationMinutes: number;
  distanceKm: number | null;
  trainType: string;
  confidence: number;
  source?: 'INFERRED' | 'STATIC';
}

@Injectable()
export class RouteService {
  @InjectRepository(InferredRouteEntity)
  private readonly inferredRouteRepository!: Repository<InferredRouteEntity>;

  async findAll(): Promise<Route[]> {
    const rows = await this.inferredRouteRepository.find({
      order: { updatedAt: 'DESC' },
      take: 2000,
    });

    return rows.map((row) => ({
      id: row.id,
      originStationId: row.originStationId,
      destinationStationId: row.destinationStationId,
      duration: row.durationMinutes,
      distance: row.distanceKm,
      trainType: row.trainType,
      source: row.source,
      confidence: row.confidence,
      tripId: row.tripId,
      trainId: row.trainId,
      pathStationIds: row.pathStationIds,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async upsertRoutes(routes: UpsertRouteDto[]): Promise<number> {
    let upsertedCount = 0;

    for (const route of routes) {
      const existing = await this.inferredRouteRepository.findOneBy({ routeKey: route.routeKey });
      if (existing) {
        const merged = this.inferredRouteRepository.merge(existing, {
          trainId: route.trainId ?? null,
          tripId: route.tripId ?? null,
          originStationId: route.originStationId,
          destinationStationId: route.destinationStationId,
          pathStationIds: route.pathStationIds,
          durationMinutes: route.durationMinutes,
          distanceKm: route.distanceKm,
          trainType: route.trainType,
          confidence: route.confidence,
          source: route.source ?? 'INFERRED',
        });
        await this.inferredRouteRepository.save(merged);
        upsertedCount += 1;
        continue;
      }

      const newRoute = this.inferredRouteRepository.create({
        routeKey: route.routeKey,
        trainId: route.trainId ?? null,
        tripId: route.tripId ?? null,
        originStationId: route.originStationId,
        destinationStationId: route.destinationStationId,
        pathStationIds: route.pathStationIds,
        durationMinutes: route.durationMinutes,
        distanceKm: route.distanceKm,
        trainType: route.trainType,
        confidence: route.confidence,
        source: route.source ?? 'INFERRED',
      });

      await this.inferredRouteRepository.save(newRoute);
      upsertedCount += 1;
    }

    return upsertedCount;
  }
}
