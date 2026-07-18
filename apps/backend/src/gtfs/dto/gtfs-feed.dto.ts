export interface GtfsFeedHeaderDto {
  gtfsRealtimeVersion: string;
  timestamp?: string;
}

export interface GtfsTripStopTimingDto {
  delay?: number;
  time?: string;
}

export interface GtfsStopTimeUpdateDto {
  stopId?: string;
  arrival?: GtfsTripStopTimingDto;
  departure?: GtfsTripStopTimingDto;
  scheduleRelationship?: 'SCHEDULED' | 'SKIPPED' | 'NO_DATA';
}

export interface GtfsTripDescriptorDto {
  tripId?: string;
  scheduleRelationship?: 'SCHEDULED' | 'CANCELED' | 'UNSCHEDULED';
}

export interface GtfsTripUpdateEntityDto {
  id: string;
  tripUpdate?: {
    trip?: GtfsTripDescriptorDto;
    stopTimeUpdate?: GtfsStopTimeUpdateDto[];
    vehicle?: {
      wheelchairAccessible?: string;
    };
    delay?: number;
  };
}

export interface GtfsTripUpdatesFeedDto {
  header?: GtfsFeedHeaderDto;
  entity?: GtfsTripUpdateEntityDto[];
}

export interface GtfsVehiclePositionEntityDto {
  id: string;
  vehicle?: {
    trip?: {
      tripId?: string;
    };
    position?: {
      latitude?: number;
      longitude?: number;
    };
    currentStatus?: 'INCOMING_AT' | 'STOPPED_AT' | 'IN_TRANSIT_TO';
    timestamp?: string;
    stopId?: string;
    vehicle?: {
      id?: string;
      label?: string;
    };
  };
}

export interface GtfsVehiclePositionsFeedDto {
  header?: GtfsFeedHeaderDto;
  entity?: GtfsVehiclePositionEntityDto[];
}

export interface LdFleetTrainDto {
  codComercial?: string;
  codEstAnt?: string;
  codEstSig?: string;
  horaLlegadaSigEst?: string;
  codProduct?: number;
  codOrigen?: string;
  codDestino?: string;
  accesible?: boolean;
  ultRetraso?: string;
  latitud?: number;
  longitud?: number;
  time?: number;
  p?: string;
  mat?: string;
}

export interface LdFleetFeedDto {
  fechaActualizacion?: string;
  trenes?: LdFleetTrainDto[];
}
