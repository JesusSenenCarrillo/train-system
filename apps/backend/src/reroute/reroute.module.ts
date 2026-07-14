import { Module } from '@nestjs/common';
import { RerouteController } from './reroute.controller';
import { RerouteService } from './reroute.service';

@Module({
  controllers: [RerouteController],
  providers: [RerouteService],
  exports: [RerouteService],
})
export class RerouteModule {}
