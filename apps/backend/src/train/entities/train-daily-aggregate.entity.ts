import {Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';

@Entity({ name: 'train_daily_aggregates' })
@Index(['serviceDate', 'trainId'], { unique: true })
export class TrainDailyAggregateEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  serviceDate!: string;

  @Column({ type: 'varchar', length: 60 })
  trainId!: string;

  @Column({ type: 'int', default: 0 })
  stopEventsCount!: number;

  @Column({ type: 'int', default: 0 })
  avgDelaySeconds!: number;

  @Column({ type: 'int', default: 0 })
  maxDelaySeconds!: number;

  @Column({ type: 'int', default: 0 })
  anomalyEventsCount!: number;

  @Column({ type: 'jsonb', nullable: true })
  metrics!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
