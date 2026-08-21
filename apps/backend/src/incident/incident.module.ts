import {forwardRef, Module} from '@nestjs/common';
import {IncidentController} from './incident.controller';
import {IncidentService} from './incident.service';
import {AlertClassifierService} from './alert-classifier.service';
import {TypeOrmModule} from '@nestjs/typeorm';
import {IncidentArchiveEntity} from './entities/incident-archive.entity';
import {GtfsModule} from '../gtfs/gtfs.module';
import {TrainStopEventEntity} from '../train/entities/train-stop-event.entity';
import {RouteEntity} from '../route/entities/route.entity';
import {IncidentImpactInferenceService} from './incident-impact-inference.service';

@Module({
  imports: [TypeOrmModule.forFeature([IncidentArchiveEntity, TrainStopEventEntity, RouteEntity]), forwardRef(() => GtfsModule)],
  controllers: [IncidentController],
  providers: [IncidentService, AlertClassifierService, IncidentImpactInferenceService],
  exports: [IncidentService, AlertClassifierService, IncidentImpactInferenceService],
})
export class IncidentModule {}
