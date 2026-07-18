import {Module} from '@nestjs/common';
import {RouteController} from './route.controller';
import {RouteService} from './route.service';
import {TypeOrmModule} from '@nestjs/typeorm';
import {InferredRouteEntity} from './entities/inferred-route.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InferredRouteEntity])],
  controllers: [RouteController],
  providers: [RouteService],
  exports: [RouteService],
})
export class RouteModule {}
