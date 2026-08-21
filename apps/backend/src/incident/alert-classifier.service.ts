import {Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Cron, CronExpression} from '@nestjs/schedule';
import {GtfsClientService} from '../gtfs/gtfs-client.service';
import {GtfsAlertEntityDto,} from '../gtfs/dto/gtfs-alert.dto';
import {IncidentArchiveEntity} from './entities/incident-archive.entity';
import {IncidentSeverity, IncidentType} from '@train-system/shared-types';
import {IncidentImpactInferenceService} from './incident-impact-inference.service';

@Injectable()
export class AlertClassifierService {
  private readonly logger = new Logger(AlertClassifierService.name);

  constructor(
    private readonly gtfsClient: GtfsClientService,
    private readonly impactInference: IncidentImpactInferenceService,
    @InjectRepository(IncidentArchiveEntity)
    private readonly incidentRepo: Repository<IncidentArchiveEntity>,
  ) {}

  /**
   * Fetches and classifies GTFS-RT alerts every 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async fetchAndClassifyAlerts(): Promise<void> {
    try {
      const data = await this.gtfsClient.fetchAlerts();

      for (const entity of data.entity ?? []) {
        await this.processAlert(entity);
      }
    } catch (err) {
      this.logger.error('Failed to fetch Renfe alerts', err);
    }
  }

  /**
   * Processes a single GTFS alert entity, classifying it and persisting it if new.
   *
   * @param entity - The raw GTFS alert entity.
   */
  private async processAlert(entity: GtfsAlertEntityDto): Promise<void> {
    const externalId = entity.id;
    const existing = await this.incidentRepo.findOneBy({ externalId });
    if (existing) {
      return;
    }

    const alert = entity.alert;
    const header = alert?.headerText?.translation?.[0]?.text ?? '';
    const description = alert?.descriptionText?.translation?.[0]?.text ?? '';
    const fullText = `${header} ${description}`.toLowerCase();

    const { type, severity, estimatedDelay } = this.classifyText(fullText);

    const informed = alert?.informedEntity ?? [];
    const routeIds = [
      ...new Set(informed.map((e) => e.routeId).filter((value): value is string => Boolean(value))),
    ];
    const stopIds = [
      ...new Set(informed.map((e) => e.stopId).filter((value): value is string => Boolean(value))),
    ];
    const inferredImpact = await this.impactInference.infer({
      routeIds,
      stopIds,
    });

    const activePeriod = alert?.activePeriod?.[0];

    const incident = this.incidentRepo.create({
      externalId: externalId,
      source: 'GTFS_RT',
      trainId: inferredImpact.primaryTrainId,
      stationId: inferredImpact.primaryStationId,
      incidentType: type,
      severity,
      estimatedDelayMinutes: estimatedDelay,
      routeIds,
      affectedTrainIds: inferredImpact.affectedTrainIds,
      affectedStationIds: inferredImpact.affectedStationIds,
      affectedStopIds: stopIds,
      description: [header, description].filter(Boolean).join('\n'),
      language: alert?.descriptionText?.translation?.[0]?.language ?? 'es',
      startedAt: activePeriod?.start
        ? new Date(activePeriod.start * 1000)
        : new Date(),
      endedAt: activePeriod?.end
        ? new Date(activePeriod.end * 1000)
        : null,
      status: 'active',
      metadata: null,
      raw: alert as Record<string, unknown>,
    });

    await this.incidentRepo.save(incident);
    this.logger.log(`Classified ${externalId} as ${type} (${severity})`);
  }

  /**
   * Classifies a free-text incident description.
   *
   * @param text - The description to classify.
   * @returns The inferred incident type, severity, and estimated delay in minutes.
   */
  classify(text: string): {
    incidentType: IncidentType;
    severity: IncidentSeverity;
    estimatedDelayMinutes: number | null;
  } {
    const {type, severity, estimatedDelay} = this.classifyText(text);
    return {
      incidentType: type,
      severity,
      estimatedDelayMinutes: estimatedDelay,
    };
  }

  /**
   * Keyword-based classifier that scores a text against known incident categories.
   *
   * @param text - The lower-case text to analyze.
   * @returns The best matching type, severity, and any extracted delay estimate.
   */
  private classifyText(text: string): {
    type: IncidentType;
    severity: IncidentSeverity;
    estimatedDelay: number | null;
  } {
    const keywords: Record<IncidentType, string[]> = {
      [IncidentType.BREAKDOWN]: [
        'avería',
        'fallo',
        'falla',
        'tren averiado',
        'incidencia técnica',
        'problema técnico',
        'fallo mecánico',
        'tren inmovilizado',
      ],
      [IncidentType.WEATHER]: [
        'condiciones meteorológicas',
        'adversas',
        'tormenta',
        'nieve',
        'hielo',
        'inundación',
        'viento',
        'temporal',
        'meteorología',
      ],
      [IncidentType.STRIKE]: [
        'huelga',
        'paro laboral',
        'conflicto laboral',
        'servicios mínimos',
        'huelga general',
      ],
      [IncidentType.ACCIDENT]: [
        'accidente',
        'atropello',
        'colisión',
        'descarrilamiento',
        'persona en vías',
        'obstáculo',
        'emergencia',
      ],
      [IncidentType.INFRASTRUCTURE]: [
        'obras',
        'renovación',
        'vía',
        'catenaria',
        'señalización',
        'cambio de vía',
        'infraestructura',
      ],
      [IncidentType.MAINTENANCE]: [
        'mantenimiento programado',
        'revisión programada',
        'trabajos programados',
        'mejora',
        'baño',
        'aseo',
        'cafetería',
      ],
      [IncidentType.DELAY]: [
        'retraso',
        'demora',
        'llegada con demora',
        'salida con retraso',
        'circulación lenta',
        'velocidad reducida',
      ],
      [IncidentType.UNKNOWN]: [],
    };

    let bestType = IncidentType.UNKNOWN;
    let bestScore = 0;

    for (const [type, words] of Object.entries(keywords)) {
      const score = words.reduce(
        (acc, word) => acc + (text.includes(word) ? 1 : 0),
        0,
      );
      if (score > bestScore) {
        bestScore = score;
        bestType = type as IncidentType;
      }
    }

    let severity = IncidentSeverity.LOW;
    let estimatedDelay: number | null = null;

    if (text.includes('suspendido') || text.includes('cancelado')) {
      severity = IncidentSeverity.CRITICAL;
    } else if (text.includes('retraso estimado')) {
      const match = text.match(/retraso estimado.*?(\d+)\s*min/i);
      if (match) {
        estimatedDelay = parseInt(match[1], 10);
      }
      if (estimatedDelay && estimatedDelay > 30) {
        severity = IncidentSeverity.HIGH;
      } else if (estimatedDelay && estimatedDelay > 10) {
        severity = IncidentSeverity.MEDIUM;
      }
    } else if (
      bestType === IncidentType.BREAKDOWN ||
      bestType === IncidentType.ACCIDENT
    ) {
      severity = IncidentSeverity.HIGH;
    } else if (bestType === IncidentType.STRIKE) {
      severity = IncidentSeverity.CRITICAL;
    } else if (bestType === IncidentType.INFRASTRUCTURE) {
      severity = IncidentSeverity.MEDIUM;
    }

    return { type: bestType, severity, estimatedDelay };
  }

  /**
   * Returns active incidents that affect a given route id.
   *
   * @param routeId - The route id to query.
   * @returns A list of active incidents ordered by severity and start time.
   */
  async getActiveIncidentsForRoute(
    routeId: string,
  ): Promise<IncidentArchiveEntity[]> {
    return this.getActiveIncidents((qb) =>
      qb.where('i.routeIds && ARRAY[:routeId]', { routeId }),
    );
  }

  /**
   * Returns active incidents that affect a given train id.
   *
   * @param trainId - The train id to query.
   * @returns A list of active incidents ordered by severity and start time.
   */
  async getActiveIncidentsForTrain(
    trainId: string,
  ): Promise<IncidentArchiveEntity[]> {
    return this.getActiveIncidents((qb) =>
      qb.where('i.trainId = :trainId', { trainId }).orWhere(
        'i.affectedTrainIds && ARRAY[:trainId]',
        { trainId },
      ),
    );
  }

  /**
   * Returns active incidents that affect a given station id.
   *
   * @param stationId - The station id to query.
   * @returns A list of active incidents ordered by severity and start time.
   */
  async getActiveIncidentsForStation(
    stationId: string,
  ): Promise<IncidentArchiveEntity[]> {
    return this.getActiveIncidents((qb) =>
      qb.where('i.stationId = :stationId', { stationId }).orWhere(
        'i.affectedStationIds && ARRAY[:stationId]',
        { stationId },
      ).orWhere(
        'i.affectedStopIds && ARRAY[:stationId]',
        { stationId },
      ),
    );
  }

  /**
   * Returns all currently active incidents.
   *
   * @returns Active incidents ordered by severity and start time.
   */
  async getAllActiveIncidents(): Promise<IncidentArchiveEntity[]> {
    return this.getActiveIncidents(() => {
      // Intentionally no extra filter: caller needs full active incident snapshot.
    });
  }

  /**
   * Builds a query for active incidents and applies a caller-defined filter.
   *
   * @param whereClause - Function that adds the specific filter to the query builder.
   * @returns A list of active incidents ordered by severity and start time.
   */
  private async getActiveIncidents(
    whereClause: (qb: ReturnType<typeof this.incidentRepo.createQueryBuilder>) => void,
  ): Promise<IncidentArchiveEntity[]> {
    const now = new Date();
    const qb = this.incidentRepo
      .createQueryBuilder('i')
      .andWhere('i.status = :status', { status: 'active' })
      .andWhere('(i.endedAt IS NULL OR i.endedAt >= :now)', { now })
      .orderBy('i.severity', 'DESC')
      .addOrderBy('i.startedAt', 'DESC');

    whereClause(qb);
    return qb.getMany();
  }
}
