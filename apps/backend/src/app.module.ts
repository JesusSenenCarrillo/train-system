import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { StationModule } from './station/station.module';
import { TrainModule } from './train/train.module';
import { IncidentModule } from './incident/incident.module';
import { RerouteModule } from './reroute/reroute.module';
import { RouteModule } from './route/route.module';

@Module({
  imports: [DatabaseModule, StationModule, TrainModule, IncidentModule, RerouteModule, RouteModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
