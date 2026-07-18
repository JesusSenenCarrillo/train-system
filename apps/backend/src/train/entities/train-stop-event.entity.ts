import {Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity({ name: 'train_stop_events' })
@Index(['trainId', 'occurredAt'])
@Index(['stationId', 'occurredAt'])
export class TrainStopEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 60 })
  trainId!: string;

  @Column({ type: 'varchar', length: 20 })
  stationId!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  tripId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  eventType!: 'ARRIVAL' | 'DEPARTURE' | 'PASSING';

  @Column({ type: 'timestamp' })
  occurredAt!: Date;

  @Column({ type: 'int', nullable: true })
  delaySeconds!: number | null;

  @Column({ type: 'varchar', length: 20, default: 'GTFS_RT' })
  source!: 'GTFS_RT' | 'LD' | 'MANUAL';

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
