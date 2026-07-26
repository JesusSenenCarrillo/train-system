export interface DelayPredictionResponseDto {
  trainId: string | null;
  routeId: string | null;
  stationId: string | null;
  estimatedDelayMinutes: number;
  confidence: number;
  modelVersion: string;
}
