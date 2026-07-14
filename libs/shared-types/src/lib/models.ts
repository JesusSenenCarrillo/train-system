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
  originStationId: number;
  destinationStationId: number;
  duration: number;
  distance: number;
  trainType: string;
}

export interface Train {
  id: number;
  name: string;
  type: string;
  capacity: number;
  status: string;
}

export interface IncidentPayload {
  trainId: number;
  stationId: number;
  type: string;
  description: string;
}

export interface Incident {
  id: number;
  trainId: number;
  stationId: number;
  type: string;
  description: string;
  timestamp: string;
  status: string;
}

export interface ReroutePlan {
  id: number;
  incidentId: number;
  suggestedRoutes: string[];
  affectedPassengers: number;
  createdAt: string;
}
