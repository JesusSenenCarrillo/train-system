import {forwardRef, Module} from '@nestjs/common';
import {HttpModule} from '@nestjs/axios';
import {TrainController} from './train.controller';
import {TrainService} from './train.service';
import {TrainAggregateService} from './train-aggregate.service';
import {AggregateComputerService} from './aggregate-computer.service';
import {DelayPredictionClientService} from './delay-prediction-client.service';
import {DelayPredictionFeatureAssemblerService} from './delay-prediction-feature-assembler.service';
import {TypeOrmModule} from '@nestjs/typeorm';
import {TrainEntity} from './entities/train.entity';
import {TrainStopEventEntity} from './entities/train-stop-event.entity';
import {TrainDailyAggregateEntity} from './entities/train-daily-aggregate.entity';
import {StationDailyAggregateEntity} from '../station/entities/station-daily-aggregate.entity';
import {RouteDailyAggregateEntity} from '../route/entities/route-daily-aggregate.entity';
import {IncidentModule} from '../incident/incident.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrainEntity, TrainStopEventEntity, TrainDailyAggregateEntity, StationDailyAggregateEntity, RouteDailyAggregateEntity]),
    HttpModule,
    forwardRef(() => IncidentModule),
  ],
  controllers: [TrainController],
  providers: [TrainService, TrainAggregateService, AggregateComputerService, DelayPredictionClientService, DelayPredictionFeatureAssemblerService],
  exports: [TrainService, TrainAggregateService, DelayPredictionClientService, DelayPredictionFeatureAssemblerService],
})
export class TrainModule {}
