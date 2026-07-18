import {Controller, Get, Inject, Post} from '@nestjs/common';
import {GtfsIngestionService} from './gtfs-ingestion.service';

@Controller('gtfs')
export class GtfsController {
  @Inject(GtfsIngestionService)
  private readonly gtfsIngestionService!: GtfsIngestionService;

  @Post('sync')
  syncNow() {
    return this.gtfsIngestionService.syncNow();
  }

  @Get('status')
  getStatus() {
    return {
      latestSync: this.gtfsIngestionService.getLatestStats(),
    };
  }
}
