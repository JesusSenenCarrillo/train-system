import {Train} from '@train-system/shared-types';
import {CreateStopEventDto} from '../../train/dto/create-stop-event.dto';

export interface NormalizedTripUpdateDto {
  source: 'LD' | 'COMMUTER';
  entityId: string;
  tripId: string;
  scheduleRelationship: 'SCHEDULED' | 'CANCELED' | 'UNSCHEDULED';
  delaySeconds: number | null;
  wheelchairAccessible: string | null;
  stopTimeUpdates: Array<{
    stopId: string;
    scheduleRelationship: 'SCHEDULED' | 'SKIPPED' | 'NO_DATA' | null;
    arrivalTime: string | null;
    arrivalDelaySeconds: number | null;
    departureTime: string | null;
    departureDelaySeconds: number | null;
  }>;
}

export interface NormalizedVehiclePositionDto {
  source: 'LD' | 'COMMUTER';
  entityId: string;
  trainId: string;
  tripId: string | null;
  stopId: string | null;
  latitude: number;
  longitude: number;
  currentStatus: string;
  updatedAt: number;
  vehicleId: string | null;
  vehicleLabel: string | null;
}

export interface IngestionPayloadBundleDto {
  liveSnapshots: Train[];
  stopEvents: CreateStopEventDto[];
  normalizedTripUpdates: NormalizedTripUpdateDto[];
}

export interface IngestionSyncStatsDto {
  pulledAt: string;
  liveSnapshotsWritten: number;
  stopEventsWritten: number;
  aggregatesWritten: number;
  inferredRoutesWritten: number;
}
