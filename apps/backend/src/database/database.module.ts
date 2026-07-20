import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {TrainEntity} from '../train/entities/train.entity';
import {TrainStopEventEntity} from '../train/entities/train-stop-event.entity';
import {TrainDailyAggregateEntity} from '../train/entities/train-daily-aggregate.entity';
import {IncidentArchiveEntity} from '../incident/entities/incident-archive.entity';
import {InferredRouteEntity} from '../route/entities/inferred-route.entity';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(<string>process.env.DB_PORT) || 5432,
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            entities: [TrainEntity, TrainStopEventEntity, TrainDailyAggregateEntity, IncidentArchiveEntity, InferredRouteEntity],
            synchronize: process.env.DB_SYNCHRONIZE === 'true' || process.env.NODE_ENV !== 'production',
            logging: true,
        }),
    ],
})
export class DatabaseModule {}