import {Module} from '@nestjs/common';
import {IncidentController} from './incident.controller';
import {IncidentService} from './incident.service';
import {TypeOrmModule} from '@nestjs/typeorm';
import {IncidentArchiveEntity} from './entities/incident-archive.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IncidentArchiveEntity])],
  controllers: [IncidentController],
  providers: [IncidentService],
  exports: [IncidentService],
})
export class IncidentModule {}
