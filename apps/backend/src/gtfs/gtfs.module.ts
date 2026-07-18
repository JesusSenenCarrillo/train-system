import {Module} from '@nestjs/common';
import {GtfsController} from './gtfs.controller';
import {GtfsClientService} from './gtfs-client.service';
import {GtfsNormalizerService} from './gtfs-normalizer.service';
import {GtfsIngestionService} from './gtfs-ingestion.service';
import {RouteInferenceService} from './route-inference.service';
import {TrainModule} from '../train/train.module';
import {RouteModule} from '../route/route.module';
import {StationModule} from '../station/station.module';

@Module({
  imports: [TrainModule, RouteModule, StationModule],
  controllers: [GtfsController],
  providers: [GtfsClientService, GtfsNormalizerService, GtfsIngestionService, RouteInferenceService],
})
export class GtfsModule {}
