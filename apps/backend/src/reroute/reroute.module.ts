import {forwardRef, Module} from '@nestjs/common';
import {RerouteController} from './reroute.controller';
import {RerouteService} from './reroute.service';
import {RouteGraphService} from './route-graph.service';
import {RouteModule} from '../route/route.module';
import {StationModule} from '../station/station.module';
import {TrainModule} from '../train/train.module';
import {IncidentModule} from '../incident/incident.module';

@Module({
  imports: [RouteModule, StationModule, forwardRef(() => TrainModule), forwardRef(() => IncidentModule)],
  controllers: [RerouteController],
  providers: [RerouteService, RouteGraphService],
  exports: [RerouteService, RouteGraphService],
})
export class RerouteModule {}
