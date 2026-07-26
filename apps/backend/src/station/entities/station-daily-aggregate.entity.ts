import {Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn} from "typeorm";

@Entity({name: 'station_daily_aggregates'})
@Index(['serviceDate', 'stationId'], {unique: true})
export class StationDailyAggregateEntity {
    @PrimaryGeneratedColumn() id!: number;

    @Column({type: 'date'}) serviceDate!: string;

    @Column({type: 'varchar', length: 20}) stationId!: string;

    @Column({type: 'int', default: 0}) stopEventsCount!: number;

    @Column({type: 'int', default: 0}) avgDelaySeconds!: number;

    @Column({type: 'int', default: 0}) maxDelaySeconds!: number;

    @Column({type: 'int', default: 0}) arrivalCount!: number;

    @Column({type: 'int', default: 0}) departureCount!: number;

    @Column({type: 'jsonb', nullable: true}) metrics!: Record<string, unknown> | null;

    @CreateDateColumn({type: 'timestamptz'}) createdAt!: Date;
}