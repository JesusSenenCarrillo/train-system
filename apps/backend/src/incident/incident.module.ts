import {forwardRef, Module} from '@nestjs/common';
import {IncidentController} from './incident.controller';
import {IncidentService} from './incident.service';
import {AlertClassifierService} from './alert-classifier.service';
import {TypeOrmModule} from '@nestjs/typeorm';
import {IncidentArchiveEntity} from './entities/incident-archive.entity';
import {GtfsModule} from '../gtfs/gtfs.module';

@Module({
  imports: [TypeOrmModule.forFeature([IncidentArchiveEntity]), forwardRef(() => GtfsModule)],
  controllers: [IncidentController],
  providers: [IncidentService, AlertClassifierService],
  exports: [IncidentService, AlertClassifierService],
})
export class IncidentModule {}
