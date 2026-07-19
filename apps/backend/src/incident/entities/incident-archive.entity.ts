import {Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';

@Entity({ name: 'incident_archive' })
@Index(['externalId'])
@Index(['startedAt'])
export class IncidentArchiveEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  externalId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  source!: 'MANUAL' | 'GTFS_RT';

  @Column({ type: 'varchar', length: 60, nullable: true })
  trainId!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  stationId!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  routeIds!: string[];

  @Column({ type: 'varchar', length: 60 })
  type!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  language!: string | null;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  raw!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  rowUpdatedAt!: Date;
}
