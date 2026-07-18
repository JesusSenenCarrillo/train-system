import {Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {GtfsClientService} from './gtfs-client.service';
import {GtfsNormalizerService} from './gtfs-normalizer.service';
import {TrainService} from '../train/train.service';
import {TrainAggregateService} from '../train/train-aggregate.service';
import {RouteService} from '../route/route.service';
import {RouteInferenceService} from './route-inference.service';
import {IngestionSyncStatsDto} from './dto/normalized-gtfs.dto';

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
      throw new Error('GTFS synchronization already running');
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
      const inferredRoutesWritten = await this.routeService.upsertInferredRoutes(inferredRoutes);

      this.latestStats = {
        pulledAt: new Date().toISOString(),
        liveSnapshotsWritten,
        stopEventsWritten,
        aggregatesWritten,
        inferredRoutesWritten,
      };
      return this.latestStats;
    } finally {
      this.running = false;
    }
  }
}
