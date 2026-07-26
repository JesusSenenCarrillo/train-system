export interface DelayPredictionRequestDto {
  trainId?: string | null;
  routeId?: string | null;
  stationId?: string | null;
  hourOfDay: number;
  dayOfWeek: number;
  avgDelaySeconds7d: number;
  maxDelaySeconds7d: number;
  anomalyEvents7d: number;
  activeIncidentSeverity: number;
}
