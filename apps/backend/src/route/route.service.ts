import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Route} from '@train-system/shared-types';
import {LessThan, Repository} from 'typeorm';
import {RouteEntity} from './entities/route.entity';

export interface UpsertRouteDto {
  routeKey: string;
  trainId?: string | null;
  tripId?: string | null;
  originStationId: string;
  destinationStationId: string;
  pathStationIds: string[];
  durationMinutes: number;
  trainType: string;
  confidence: number;
  source?: 'INFERRED' | 'STATIC';
}

@Injectable()
export class RouteService {
  @InjectRepository(RouteEntity)
  private readonly repository!: Repository<RouteEntity>;

  async findAll(): Promise<Route[]> {
    await this.purgeStaleRoutes();
    const rows = await this.repository.find({
      order: { updatedAt: 'DESC' },
      take: 1000,
    });

    return rows.map((row) => ({
      id: row.id,
      originStationId: row.originStationId,
      destinationStationId: row.destinationStationId,
      duration: row.durationMinutes,
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
      const existing = await this.repository.findOneBy({ routeKey: route.routeKey });
      if (existing) {
        const merged = this.repository.merge(existing, {
          trainId: route.trainId ?? null,
          tripId: route.tripId ?? null,
          originStationId: route.originStationId,
          destinationStationId: route.destinationStationId,
          pathStationIds: route.pathStationIds,
          durationMinutes: route.durationMinutes,
          trainType: route.trainType,
          confidence: route.confidence,
          source: route.source ?? 'INFERRED',
        });
        await this.repository.save(merged);
        upsertedCount += 1;
        continue;
      }

      const newRoute = this.repository.create({
        routeKey: route.routeKey,
        trainId: route.trainId ?? null,
        tripId: route.tripId ?? null,
        originStationId: route.originStationId,
        destinationStationId: route.destinationStationId,
        pathStationIds: route.pathStationIds,
        durationMinutes: route.durationMinutes,
        trainType: route.trainType,
        confidence: route.confidence,
        source: route.source ?? 'INFERRED',
      });

      await this.repository.save(newRoute);
      upsertedCount += 1;
    }

    await this.purgeStaleRoutes();
    return upsertedCount;
  }

  private async purgeStaleRoutes(graceMinutes = 5): Promise<number> {
    const cutoff = new Date(Date.now() - graceMinutes * 60 * 1000);
    const result = await this.repository.delete({
      updatedAt: LessThan(cutoff),
    });
    return result.affected ?? 0;
  }
}
