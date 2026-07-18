import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {LessThan, Repository} from 'typeorm';
import {ScheduleUpdate, Train} from '@train-system/shared-types';
import {TrainEntity} from './entities/train.entity';
import {TrainStopEventEntity} from './entities/train-stop-event.entity';
import {CreateStopEventDto} from './dto/create-stop-event.dto';

@Injectable()
export class TrainService {
  @InjectRepository(TrainEntity)
  private readonly trainLiveRepository!: Repository<TrainEntity>;

  @InjectRepository(TrainStopEventEntity)
  private readonly stopEventRepository!: Repository<TrainStopEventEntity>;

  async findAll(): Promise<Train[]> {
    await this.purgeStaleLiveTrains();
    const rows = await this.trainLiveRepository.find({
      order: {
        lastSeenAt: 'DESC',
      },
    });
    return rows.map((row) => this.toTrainModel(row));
  }

  async upsertLiveState(payload: Train): Promise<Train> {
    const now = new Date();
    const liveRow = this.trainLiveRepository.create({
      trainId: payload.trainId,
      source: payload.source,
      serviceType: payload.serviceType,
      tripId: payload.tripId ?? null,
      commercialCode: payload.commercialCode ?? null,
      productCode: payload.productCode ?? null,
      originStationId: payload.originStationId ?? null,
      destinationStationId: payload.destinationStationId ?? null,
      previousStationId: payload.previousStationId ?? null,
      nextStationId: payload.nextStationId ?? null,
      nextStationArrivalAt: payload.nextStationArrivalAt ? new Date(payload.nextStationArrivalAt) : null,
      currentStopId: payload.currentStopId ?? null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      currentStatus: payload.currentStatus,
      delayMinutes: payload.delayMinutes,
      delaySeconds: payload.delaySeconds,
      updatedAt: payload.updatedAt,
      platform: payload.platform ?? null,
      vehicleId: payload.vehicleId ?? null,
      vehicleLabel: payload.vehicleLabel ?? null,
      rollingStock: payload.rollingStock ?? null,
      accessible: payload.accessible,
      metadata: payload.metadata ?? null,
      raw: payload.raw ?? null,
      lastSeenAt: now,
    });

    const existing = await this.trainLiveRepository.findOneBy({ trainId: payload.trainId });
    if (existing) {
      const merged = this.trainLiveRepository.merge(existing, liveRow);
      await this.trainLiveRepository.save(merged);
    } else {
      await this.trainLiveRepository.save(liveRow);
    }
    const saved = await this.trainLiveRepository.findOneByOrFail({ trainId: payload.trainId });
    return this.toTrainModel(saved);
  }

  async purgeStaleLiveTrains(graceMinutes = 5): Promise<number> {
    const cutoff = new Date(Date.now() - graceMinutes * 60 * 1000);
    const result = await this.trainLiveRepository.delete({
      lastSeenAt: LessThan(cutoff),
    });
    return result.affected ?? 0;
  }

  async createStopEvent(payload: CreateStopEventDto): Promise<TrainStopEventEntity | null> {
    const occurredAt = new Date(payload.occurredAt);
    const existing = await this.stopEventRepository.findOne({
      where: {
        trainId: payload.trainId,
        stationId: payload.stationId,
        eventType: payload.eventType,
        occurredAt,
      },
    });
    if (existing) {
      return null;
    }

    const eventRow = this.stopEventRepository.create({
      trainId: payload.trainId,
      stationId: payload.stationId,
      tripId: payload.tripId ?? null,
      eventType: payload.eventType,
      occurredAt,
      delaySeconds: payload.delaySeconds ?? null,
      source: payload.source ?? 'GTFS_RT',
      metadata: payload.metadata ?? null,
    });

    return this.stopEventRepository.save(eventRow);
  }

  async findStopEvents(filters: { trainId?: string; stationId?: string; limit?: number }): Promise<TrainStopEventEntity[]> {
    const where: { trainId?: string; stationId?: string } = {};
    if (filters.trainId) {
      where.trainId = filters.trainId;
    }
    if (filters.stationId) {
      where.stationId = filters.stationId;
    }

    return this.stopEventRepository.find({
      where,
      order: { occurredAt: 'DESC' },
      take: filters.limit ?? 200,
    });
  }

  async findScheduleUpdates(): Promise<ScheduleUpdate[]> {
    const events = await this.stopEventRepository.find({
      order: { occurredAt: 'DESC' },
      take: 100,
    });

    return events.map((event) => {
      const unixTime = Math.floor(event.occurredAt.getTime() / 1000).toString();
      const stopTimeUpdate =
        event.eventType === 'DEPARTURE'
          ? [{ departure: { delay: event.delaySeconds ?? 0, time: unixTime }, stopId: event.stationId }]
          : [{ arrival: { delay: event.delaySeconds ?? 0, time: unixTime }, stopId: event.stationId }];

      return {
        id: `TU_${event.id}`,
        tripUpdate: {
          trip: {
            tripId: event.tripId ?? event.trainId,
            scheduleRelationship: 'SCHEDULED',
          },
          stopTimeUpdate,
          delay: event.delaySeconds ?? 0,
        },
      };
    });
  }

  async getLlmContext(limit = 300, trainId?: string): Promise<Array<Record<string, unknown>>> {
    const rows = await this.stopEventRepository.find({
      where: trainId ? { trainId } : {},
      order: { occurredAt: 'DESC' },
      take: limit,
    });

    return rows.map((row) => ({
      trainId: row.trainId,
      stationId: row.stationId,
      eventType: row.eventType,
      occurredAt: row.occurredAt.toISOString(),
      delaySeconds: row.delaySeconds,
      source: row.source,
      metadata: row.metadata,
    }));
  }

  private toTrainModel(row: TrainEntity): Train {
    return {
      id: row.id,
      trainId: row.trainId,
      source: row.source,
      serviceType: row.serviceType,
      tripId: row.tripId,
      commercialCode: row.commercialCode,
      productCode: row.productCode,
      originStationId: row.originStationId,
      destinationStationId: row.destinationStationId,
      previousStationId: row.previousStationId,
      nextStationId: row.nextStationId,
      nextStationArrivalAt: row.nextStationArrivalAt ? row.nextStationArrivalAt.toISOString() : null,
      currentStopId: row.currentStopId,
      latitude: row.latitude,
      longitude: row.longitude,
      currentStatus: row.currentStatus,
      delayMinutes: row.delayMinutes,
      delaySeconds: row.delaySeconds,
      updatedAt: Number(row.updatedAt),
      lastSeenAt: row.lastSeenAt.toISOString(),
      platform: row.platform,
      vehicleId: row.vehicleId,
      vehicleLabel: row.vehicleLabel,
      rollingStock: row.rollingStock,
      accessible: row.accessible,
      metadata: row.metadata,
      raw: row.raw,
    };
  }
}
