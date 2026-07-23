import {Module} from '@nestjs/common';
import {RouteController} from './route.controller';
import {RouteService} from './route.service';
import {TypeOrmModule} from '@nestjs/typeorm';
import {RouteEntity} from './entities/route.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RouteEntity])],
  controllers: [RouteController],
  providers: [RouteService],
  exports: [RouteService],
})
export class RouteModule {}
