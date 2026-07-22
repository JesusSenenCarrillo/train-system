import {Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {GtfsClientService} from './gtfs-client.service';
import {GtfsNormalizerService} from './gtfs-normalizer.service';
import {TrainService} from '../train/train.service';
import {TrainAggregateService} from '../train/train-aggregate.service';
import {RouteService, UpsertRouteDto} from '../route/route.service';
import {RouteInferenceService} from './route-inference.service';
import {IngestionSyncStatsDto} from './dto/normalized-gtfs.dto';
import {LdFleetFeedDto, LdFleetWithStationsFeedDto} from './dto/gtfs-feed.dto';

@Injectable()
export class GtfsIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GtfsIngestionService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private latestStats: IngestionSyncStatsDto | null = null;

  @Inject(GtfsClientService)
  private readonly gtfsClient!: GtfsClientService;

  @Inject(GtfsNormalizerService)
  private readonly gtfsNormalizer!: GtfsNormalizerService;

  @Inject(TrainService)
  private readonly trainService!: TrainService;

  @Inject(TrainAggregateService)
  private readonly trainAggregateService!: TrainAggregateService;

  @Inject(RouteService)
  private readonly routeService!: RouteService;

  @Inject(RouteInferenceService)
  private readonly routeInferenceService!: RouteInferenceService;

  onModuleInit(): void {
    const intervalSeconds = Number(process.env.GTFS_SYNC_SECONDS ?? 20);
    this.timer = setInterval(() => {
      this.syncNow().catch((error: unknown) => {
        this.logger.error(
          error instanceof Error ? error.message : 'Unknown GTFS sync error',
          error instanceof Error ? error.stack : undefined,
        );
      });
    }, intervalSeconds * 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getLatestStats(): IngestionSyncStatsDto | null {
    return this.latestStats;
  }

  async syncNow(): Promise<IngestionSyncStatsDto> {
    if (this.running) {
      return this.latestStats ?? {
        pulledAt: new Date().toISOString(),
        liveSnapshotsWritten: 0,
        stopEventsWritten: 0,
        aggregatesWritten: 0,
        routesWritten: 0,
      };
    }

    this.running = true;
    try {
      const feeds = await this.gtfsClient.fetchFeeds();
      const normalized = this.gtfsNormalizer.normalizeFeeds(feeds);

      let liveSnapshotsWritten = 0;
      for (const snapshot of normalized.liveSnapshots) {
        await this.trainService.upsertLiveState(snapshot);
        liveSnapshotsWritten += 1;
      }

      let stopEventsWritten = 0;
      for (const event of normalized.stopEvents) {
        const created = await this.trainService.createStopEvent(event);
        if (created) {
          stopEventsWritten += 1;
        }
      }

      await this.trainService.purgeStaleLiveTrains(5);
      const aggregatesWritten = await this.trainAggregateService.refreshRecentAggregates(2);

      const inferredRoutes = this.routeInferenceService.inferRoutes({
        tripUpdates: normalized.normalizedTripUpdates,
        liveSnapshots: normalized.liveSnapshots,
      });
      const ldRoutes = this.extractLdRoutes(feeds.ldFleetWithStations, feeds.ldFleet);
      const routesWritten = await this.routeService.upsertRoutes([...inferredRoutes, ...ldRoutes]);

      this.latestStats = {
        pulledAt: new Date().toISOString(),
        liveSnapshotsWritten,
        stopEventsWritten,
        aggregatesWritten,
        routesWritten,
      };
      return this.latestStats;
    } finally {
      this.running = false;
    }
  }

  /**
   * Builds static route records from `trenesConEstacionesLD.json`.
   * Each entry provides the full ordered stop sequence (`estaciones`) and a GPS path
   * (`secuencia`). Product codes come from the live fleet feed so train type can be
   * resolved. Routes are keyed by `LD:<origin>:<destination>` and deduplicated so
   * only one canonical record per O-D pair is upserted per sync cycle.
   */
  private extractLdRoutes(
    ldFleetWithStations: LdFleetWithStationsFeedDto,
    ldFleet: LdFleetFeedDto,
  ): UpsertRouteDto[] {
    const productByTrainId = new Map<string, number>();
    for (const train of ldFleet.trenes ?? []) {
      if (train.codComercial && train.codProduct !== undefined) {
        productByTrainId.set(train.codComercial, train.codProduct);
      }
    }

    const seen = new Set<string>();
    const output: UpsertRouteDto[] = [];

    for (const train of ldFleetWithStations.trenes ?? []) {
      const stops = train.estaciones;
      if (!stops || stops.length < 2) {
        continue;
      }

      const origin = stops[0].p;
      const dest = stops[stops.length - 1].p;
      const key = `LD:${origin}:${dest}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const pathStationIds = stops.map((s) => s.p);
      const durationMinutes = this.calcDurationMinutes(stops[0].h, stops[stops.length - 1].h);
      const codProduct = productByTrainId.get(train.idTren);

      output.push({
        routeKey: key,
        trainId: null,
        tripId: null,
        originStationId: origin,
        destinationStationId: dest,
        pathStationIds,
        durationMinutes,
        distanceKm: null,
        trainType: this.mapProductCode(codProduct),
        confidence: 1,
        source: 'STATIC',
      });
    }

    return output;
  }

  /**
   * Parses two "HH:MM" scheduled times and returns the difference in whole minutes.
   * Handles overnight trains where the arrival time is numerically less than departure.
   */
  private calcDurationMinutes(departureHhmm: string, arrivalHhmm: string): number {
    const toMinutes = (hhmm: string): number => {
      const [h, m] = hhmm.split(':').map(Number);
      return (h ?? 0) * 60 + (m ?? 0);
    };

    const dep = toMinutes(departureHhmm);
    const arr = toMinutes(arrivalHhmm);
    const diff = arr - dep;
    return diff >= 0 ? diff : diff + 24 * 60;
  }

  private mapProductCode(codProduct: number | undefined): string {
    // Source: trenType array from tiempo-real.largorecorrido.renfe.com JS
    const types: Record<number, string> = {
      0: 'MV',        // Movimientos
      2: 'AVE',       // Alta Velocidad
      3: 'AVANT',     // Avant (AV-MD)
      4: 'TALGO',     // Talgo LD
      5: 'ALTARIA',   // Altaria LD
      7: 'DIURNO',    // Diurno LD
      8: 'ESTRELLA',  // Estrella LD
      9: 'TRENHOTEL', // Tren Hotel LD
      10: 'EUROMED',  // Euromed LD
      11: 'ALVIA',    // Alvia LD
      13: 'INTERCITY',
      14: 'MD',       // Andalucía Express
      15: 'MD',       // Catalunya Express
      16: 'MD',       // Media Distancia
      18: 'REGIONAL',
      19: 'REGIONAL_EXPRESS',
      20: 'TRD',
      21: 'CERCANIAS',
      22: 'HISTORICO',
      23: 'TURISTICO',
      24: 'AV_CITY',
      25: 'AVE_TGV',
      26: 'TRANVIA',
      27: 'EUSKOTREN',
      28: 'AVLO',
      29: 'TEMATICO',
    };
    return codProduct !== undefined ? (types[codProduct] ?? 'LD') : 'LD';
  }
}
