export interface CreateStopEventDto {
  trainId: string;
  stationId: string;
  tripId?: string | null;
  eventType: 'ARRIVAL' | 'DEPARTURE' | 'PASSING';
  occurredAt: string;
  delaySeconds?: number | null;
  source?: 'GTFS_RT' | 'LD' | 'MANUAL';
  metadata?: Record<string, unknown> | null;
}
