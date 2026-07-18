import {Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,} from 'typeorm';

@Entity({ name: 'train_live_state' })
export class TrainEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Index({ unique: true })
    @Column({type: 'varchar', length: 60, unique: true})
    trainId!: string;

    @Column({type: 'varchar', length: 20})
    source!: 'LD' | 'COMMUTER';

    @Column({type: 'varchar', length: 20})
    serviceType!: 'LD' | 'COMMUTER';

    @Column({type: 'varchar', length: 60, nullable: true})
    tripId!: string | null;

    @Column({type: 'varchar', length: 20, nullable: true})
    commercialCode!: string | null;

    @Column({type: 'int', nullable: true})
    productCode!: number | null;

    @Column({type: 'varchar', length: 20, nullable: true})
    originStationId!: string | null;

    @Column({type: 'varchar', length: 20, nullable: true})
    destinationStationId!: string | null;

    @Column({type: 'varchar', length: 20, nullable: true})
    previousStationId!: string | null;

    @Column({type: 'varchar', length: 20, nullable: true})
    nextStationId!: string | null;

    @Column({type: 'timestamp', nullable: true})
    nextStationArrivalAt!: Date | null;

    @Column({type: 'varchar', length: 20, nullable: true})
    currentStopId!: string | null;

    @Column({type: 'double precision'})
    latitude!: number;

    @Column({type: 'double precision'})
    longitude!: number;

    @Column({type: 'varchar', length: 30})
    currentStatus!: string;

    @Column({type: 'int', default: 0})
    delayMinutes!: number;

    @Column({type: 'int', default: 0})
    delaySeconds!: number;

    @Column({type: 'bigint'})
    updatedAt!: number;

    @Column({type: 'timestamp'})
    lastSeenAt!: Date;

    @Column({type: 'varchar', length: 20, nullable: true})
    platform!: string | null;

    @Column({type: 'varchar', length: 30, nullable: true})
    vehicleId!: string | null;

    @Column({type: 'varchar', length: 100, nullable: true})
    vehicleLabel!: string | null;

    @Column({type: 'varchar', length: 80, nullable: true})
    rollingStock!: string | null;

    @Column({type: 'boolean', default: false})
    accessible!: boolean;

    @Column({type: 'jsonb', nullable: true})
    metadata!: Record<string, unknown> | null;

    @Column({type: 'jsonb', nullable: true})
    raw!: Record<string, unknown> | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    rowUpdatedAt!: Date;
}