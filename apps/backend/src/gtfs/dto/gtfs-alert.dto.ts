export interface GtfsAlertTranslationDto {
  text?: string;
  language?: string;
}

export interface GtfsAlertTextDto {
  translation?: GtfsAlertTranslationDto[];
}

export interface GtfsAlertActivePeriodDto {
  start?: number;
  end?: number;
}

export interface GtfsAlertInformedEntityDto {
  routeId?: string;
  stopId?: string;
  tripId?: string;
  agencyId?: string;
}

export interface GtfsAlertDto {
  activePeriod?: GtfsAlertActivePeriodDto[];
  informedEntity?: GtfsAlertInformedEntityDto[];
  headerText?: GtfsAlertTextDto;
  descriptionText?: GtfsAlertTextDto;
}

export interface GtfsAlertEntityDto {
  id: string;
  alert?: GtfsAlertDto;
}

export interface GtfsAlertsFeedDto {
  header?: {
    gtfsRealtimeVersion?: string;
    timestamp?: number;
  };
  entity?: GtfsAlertEntityDto[];
}
