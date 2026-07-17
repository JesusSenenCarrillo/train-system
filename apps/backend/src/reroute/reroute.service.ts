import {Injectable} from '@nestjs/common';
import {IncidentPayload, ReroutePlan} from '@train-system/shared-types';

@Injectable()
export class RerouteService {
  private plans: ReroutePlan[] = [];

  create(payload: IncidentPayload): ReroutePlan {
      const routeId = payload.alert?.informedEntity?.find((entity) => entity.routeId)?.routeId;
      const contextRef = routeId ?? payload.stationId ?? payload.trainId ?? 'desconocido';

    const plan: ReroutePlan = {
      id: this.plans.length + 1,
      incidentId: this.plans.length + 1,
      suggestedRoutes: [
          `Ruta alternativa vía ${contextRef}`,
        'Reasignación a servicio regional',
        'Conexión con siguiente tren de respaldo'
      ],
      affectedPassengers: 280,
      createdAt: new Date().toISOString(),
    };
    this.plans.push(plan);
    return plan;
  }

  findOne(id: number): ReroutePlan | undefined {
    return this.plans.find((plan) => plan.id === id);
  }
}
