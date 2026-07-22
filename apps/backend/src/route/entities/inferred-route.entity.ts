import {Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';

@Entity({ name: 'routes' })
@Index(['routeKey'], { unique: true })
@Index(['tripId'])
@Index(['trainId'])
export class InferredRouteEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 160, unique: true })
  routeKey!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  trainId!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  tripId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  originStationId!: string;

  @Column({ type: 'varchar', length: 20 })
  destinationStationId!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  pathStationIds!: string[];

  @Column({ type: 'int', default: 0 })
  durationMinutes!: number;

  @Column({ type: 'double precision', nullable: true })
  distanceKm!: number | null;

  @Column({ type: 'varchar', length: 30, default: 'UNKNOWN' })
  trainType!: string;

  @Column({ type: 'varchar', length: 20, default: 'INFERRED' })
  source!: 'INFERRED' | 'STATIC';

  @Column({ type: 'double precision', default: 0.5 })
  confidence!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
