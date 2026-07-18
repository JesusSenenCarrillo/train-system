import {Module} from '@nestjs/common';
import {TrainController} from './train.controller';
import {TrainService} from './train.service';
import {TrainAggregateService} from './train-aggregate.service';
import {TypeOrmModule} from '@nestjs/typeorm';
import {TrainEntity} from './entities/train.entity';
import {TrainStopEventEntity} from './entities/train-stop-event.entity';
import {TrainDailyAggregateEntity} from './entities/train-daily-aggregate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrainEntity, TrainStopEventEntity, TrainDailyAggregateEntity])],
  controllers: [TrainController],
  providers: [TrainService, TrainAggregateService],
  exports: [TrainService, TrainAggregateService],
})
export class TrainModule {}
