import { Injectable } from '@nestjs/common';
import { Incident, IncidentPayload } from '@train-system/shared-types';

@Injectable()
export class IncidentService {
  private incidents: Incident[] = [];

  create(payload: IncidentPayload): Incident {
    const incident: Incident = {
      id: this.incidents.length + 1,
      trainId: payload.trainId,
      stationId: payload.stationId,
      type: payload.type,
      description: payload.description,
      timestamp: new Date().toISOString(),
      status: 'active',
    };
    this.incidents.push(incident);
    return incident;
  }

  findAll(): Incident[] {
    return this.incidents;
  }

  findOne(id: number): Incident | undefined {
    return this.incidents.find((incident) => incident.id === id);
  }
}
