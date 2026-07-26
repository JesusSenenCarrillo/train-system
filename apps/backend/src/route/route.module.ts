import {Module} from '@nestjs/common';
import {RouteController} from './route.controller';
import {RouteService} from './route.service';
import {RouteInferenceService} from './route-inference.service';
import {TypeOrmModule} from '@nestjs/typeorm';
import {RouteEntity} from './entities/route.entity';
import {StationModule} from '../station/station.module';

@Module({
  imports: [TypeOrmModule.forFeature([RouteEntity]), StationModule],
  controllers: [RouteController],
  providers: [RouteService, RouteInferenceService],
  exports: [RouteService, RouteInferenceService],
})
export class RouteModule {}
