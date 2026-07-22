export interface Station {
  id: number;
  name: string;
  lat: number;
  lng: number;
  code: string;
  city: string;
}

export interface Route {
  id: number;
  originStationId: string;
  destinationStationId: string;
  duration: number;
  distance: number | null;
  trainType: string;
  source?: 'INFERRED' | 'STATIC';
  confidence?: number;
  tripId?: string | null;
  trainId?: string | null;
  pathStationIds: string[];
  updatedAt?: string;
}

export interface Train {
  id?: number;
  trainId: string;
  source: 'LD' | 'COMMUTER';
  serviceType: 'LD' | 'COMMUTER';
  tripId?: string | null;
  commercialCode?: string | null;
  productCode?: number | null;
  originStationId?: string | null;
  destinationStationId?: string | null;
  previousStationId?: string | null;
  nextStationId?: string | null;
  nextStationArrivalAt?: string | null;
  currentStopId?: string | null;
  latitude: number;
  longitude: number;
  currentStatus: string;
  delayMinutes: number;
  delaySeconds: number;
  updatedAt: number;
  lastSeenAt?: string;
  platform?: string | null;
  vehicleId?: string | null;
  vehicleLabel?: string | null;
  rollingStock?: string | null;
  accessible: boolean;
  metadata?: Record<string, unknown> | null;
  raw?: Record<string, unknown> | null;
}

export interface IncidentPayload {
  trainId?: number | string | null;
  stationId?: number | string | null;
  type?: string;
  description?: string;
  id?: string;
  alert?: {
    activePeriod?: Array<{
      start?: string;
      end?: string;
    }>;
    informedEntity?: Array<{
      routeId?: string;
      stopId?: string;
      trip?: {
        tripId?: string;
      };
    }>;
    descriptionText?: {
      translation?: Array<{
        text?: string;
        language?: string;
      }>;
    };
  };
}

export interface Incident {
  id: number;
  externalId?: string | null;
  source: 'MANUAL' | 'GTFS_RT';
  trainId?: string | null;
  stationId?: string | null;
  routeIds: string[];
  type: string;
  description: string;
  language?: string | null;
  startedAt: string;
  endedAt?: string | null;
  updatedAt: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  raw?: Record<string, unknown> | null;
}

export interface ScheduleUpdate {
  id: string;
  tripUpdate: {
    trip: {
      tripId: string;
      scheduleRelationship: 'SCHEDULED' | 'CANCELED' | 'UNSCHEDULED';
    };
    stopTimeUpdate: Array<{
      arrival?: {
        delay?: number;
        time?: string;
      };
      departure?: {
        delay?: number;
        time?: string;
      };
      stopId: string;
      scheduleRelationship?: 'SCHEDULED' | 'SKIPPED' | 'NO_DATA';
    }>;
    vehicle?: {
      wheelchairAccessible?: string;
    };
    delay?: number;
  };
}

export interface ReroutePlan {
  id: number;
  incidentId: number;
  suggestedRoutes: string[];
  affectedPassengers: number;
  createdAt: string;
}
