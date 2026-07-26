import {Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn} from "typeorm";

@Entity({ name: 'route_daily_aggregates' })
@Index(['serviceDate', 'routeId'], { unique: true })
export class RouteDailyAggregateEntity {
    @PrimaryGeneratedColumn() id!: number;

    @Column({ type: 'date' }) serviceDate!: string;

    @Column({ type: 'varchar', length: 20 }) routeId!: string;

    @Column({ type: 'int', default: 0 }) stopEventsCount!: number;

    @Column({ type: 'int', default: 0 }) avgDelaySeconds!: number;

    @Column({ type: 'int', default: 0 }) maxDelaySeconds!: number;

    @Column({ type: 'int', default: 0 }) anomalyEventsCount!: number;

    @Column({ type: 'jsonb', nullable: true }) metrics!: Record<string, unknown> | null;

    @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
}