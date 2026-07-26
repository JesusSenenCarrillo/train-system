import {Injectable} from '@nestjs/common';
import {Incident, IncidentPayload} from '@train-system/shared-types';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {IncidentArchiveEntity} from './entities/incident-archive.entity';
import {AlertClassifierService} from './alert-classifier.service';

@Injectable()
export class IncidentService {
    @InjectRepository(IncidentArchiveEntity)
    private readonly incidentRepository!: Repository<IncidentArchiveEntity>;

    constructor(private readonly classifier: AlertClassifierService) {}

    /**
     * Creates a new incident from a GTFS alert or a manual payload.
     *
     * @param payload - The incident payload, which may contain a GTFS alert structure.
     * @returns The persisted incident in domain form.
     */
    async create(payload: IncidentPayload): Promise<Incident> {
        const alert = payload.alert;
        const firstPeriod = alert?.activePeriod?.[0];
        const firstTranslation = alert?.descriptionText?.translation?.[0];
        const routeIds = (alert?.informedEntity ?? [])
            .map((item) => item.routeId)
            .filter((value): value is string => Boolean(value));
        const affectedStopIds = (alert?.informedEntity ?? [])
            .map((item) => item.stopId)
            .filter((value): value is string => Boolean(value));

        const description = alert
            ? (firstTranslation?.text ?? payload.description ?? 'Service alert')
            : (payload.description ?? 'Manual incident');
        const classification = this.classifier.classify(description.toLowerCase());

        const incidentRow: IncidentArchiveEntity = this.incidentRepository.create(
            alert
                ? {
                    externalId: payload.id ?? null,
                    source: 'GTFS_RT',
                    trainId: payload.trainId ? String(payload.trainId) : null,
                    stationId: payload.stationId ? String(payload.stationId) : null,
                    routeIds,
                    affectedStopIds: affectedStopIds.length > 0 ? affectedStopIds : null,
                    description,
                    language: firstTranslation?.language ?? null,
                    startedAt: firstPeriod?.start ? new Date(Number(firstPeriod.start) * 1000) : new Date(),
                    endedAt: firstPeriod?.end ? new Date(Number(firstPeriod.end) * 1000) : null,
                    status: 'active',
                    metadata: null,
                    raw: payload as Record<string, unknown>,
                    ...classification,
                }
                : {
                    externalId: null,
                    source: 'MANUAL',
                    trainId: payload.trainId ? String(payload.trainId) : null,
                    stationId: payload.stationId ? String(payload.stationId) : null,
                    routeIds: [],
                    affectedStopIds: affectedStopIds.length > 0 ? affectedStopIds : null,
                    description,
                    language: null,
                    startedAt: new Date(),
                    endedAt: null,
                    status: 'active',
                    metadata: null,
                    raw: payload as Record<string, unknown>,
                    ...classification,
                },
        );

        const saved = await this.incidentRepository.save(incidentRow);
        return this.toModel(saved);
    }

    /**
     * Returns all incidents ordered by start time descending.
     *
     * @returns A list of incidents in domain form.
     */
    async findAll(): Promise<Incident[]> {
        const rows = await this.incidentRepository.find({
            order: {startedAt: 'DESC'},
        });
        return rows.map((row) => this.toModel(row));
    }

    /**
     * Finds an incident by its database id.
     *
     * @param id - The incident id.
     * @returns The incident in domain form, or `null` if not found.
     */
    async findOne(id: number): Promise<Incident | null> {
        const row = await this.incidentRepository.findOneBy({id});
        return row ? this.toModel(row) : null;
    }

    /**
     * Converts an incident entity into the domain {@link Incident} model.
     *
     * @param row - The persisted entity.
     * @returns The domain model.
     */
    private toModel(row: IncidentArchiveEntity): Incident {
        return {
            id: row.id,
            externalId: row.externalId,
            source: row.source,
            trainId: row.trainId,
            stationId: row.stationId,
            routeIds: row.routeIds,
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
