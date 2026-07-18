import {Injectable} from '@nestjs/common';
import {Incident, IncidentPayload} from '@train-system/shared-types';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {IncidentArchiveEntity} from './entities/incident-archive.entity';

@Injectable()
export class IncidentService {
  @InjectRepository(IncidentArchiveEntity)
  private readonly incidentRepository!: Repository<IncidentArchiveEntity>;

  async create(payload: IncidentPayload): Promise<Incident> {
    const alert = payload.alert;
    const firstPeriod = alert?.activePeriod?.[0];
    const firstTranslation = alert?.descriptionText?.translation?.[0];
    const routeIds = (alert?.informedEntity ?? [])
      .map((item) => item.routeId)
      .filter((value): value is string => Boolean(value));

    const incidentRow = this.incidentRepository.create(
      alert
        ? {
            externalId: payload.id ?? null,
            source: 'GTFS_RT',
            trainId: payload.trainId ? String(payload.trainId) : null,
            stationId: payload.stationId ? String(payload.stationId) : null,
            routeIds,
            type: payload.type ?? 'service_alert',
            description: firstTranslation?.text ?? payload.description ?? 'Service alert',
            language: firstTranslation?.language ?? null,
            startedAt: firstPeriod?.start ? new Date(Number(firstPeriod.start) * 1000) : new Date(),
            endedAt: firstPeriod?.end ? new Date(Number(firstPeriod.end) * 1000) : null,
            status: 'active',
            metadata: null,
            raw: payload as Record<string, unknown>,
          }
        : {
            externalId: null,
            source: 'MANUAL',
            trainId: payload.trainId ? String(payload.trainId) : null,
            stationId: payload.stationId ? String(payload.stationId) : null,
            routeIds: [],
            type: payload.type ?? 'manual',
            description: payload.description ?? 'Manual incident',
            language: null,
            startedAt: new Date(),
            endedAt: null,
            status: 'active',
            metadata: null,
            raw: payload as Record<string, unknown>,
          },
    );

    const saved = await this.incidentRepository.save(incidentRow);
    return this.toModel(saved);
  }

  async findAll(): Promise<Incident[]> {
    const rows = await this.incidentRepository.find({
      order: { startedAt: 'DESC' },
    });
    return rows.map((row) => this.toModel(row));
  }

  async findOne(id: number): Promise<Incident | null> {
    const row = await this.incidentRepository.findOneBy({ id });
    return row ? this.toModel(row) : null;
  }

  private toModel(row: IncidentArchiveEntity): Incident {
    return {
      id: row.id,
      externalId: row.externalId,
      source: row.source,
      trainId: row.trainId,
      stationId: row.stationId,
      routeIds: row.routeIds,
      type: row.type,
      description: row.description,
      language: row.language,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt ? row.endedAt.toISOString() : null,
      updatedAt: row.rowUpdatedAt.toISOString(),
      status: row.status,
      metadata: row.metadata,
      raw: row.raw,
    };
  }
}
