import {Inject, Injectable, Logger} from '@nestjs/common';
import {IncidentPayload, ReroutePlan} from '@train-system/shared-types';
import {RouteService} from '../route/route.service';
import {DelayPredictionFeatureAssemblerService} from '../train/delay-prediction-feature-assembler.service';
import {DelayPredictionClientService} from '../train/delay-prediction-client.service';
import {AlertClassifierService} from '../incident/alert-classifier.service';
import {RouteAlternative, RouteGraphService, RouteLeg} from './route-graph.service';

@Injectable()
export class RerouteService {
  private readonly logger = new Logger(RerouteService.name);

  @Inject(RouteService)
  private readonly routeService!: RouteService;

  @Inject(DelayPredictionFeatureAssemblerService)
  private readonly featureAssembler!: DelayPredictionFeatureAssemblerService;

  @Inject(DelayPredictionClientService)
  private readonly predictionClient!: DelayPredictionClientService;

  @Inject(AlertClassifierService)
  private readonly incidentClassifier!: AlertClassifierService;

  @Inject(RouteGraphService)
  private readonly routeGraph!: RouteGraphService;

  private plans: ReroutePlan[] = [];

  /**
   * Creates a reroute plan for the given incident context.
   * If origin/destination stations can be inferred, real alternatives are computed.
   */
  async create(payload: IncidentPayload): Promise<ReroutePlan> {
    const routeId = payload.alert?.informedEntity?.find((entity) => entity.routeId)?.routeId;
    const stopIds = payload.alert?.informedEntity?.map((entity) => entity.stopId).filter((id): id is string => Boolean(id)) ?? [];

    const fromStationId = payload.stationId ? String(payload.stationId) : stopIds[0];
    const toStationId = stopIds.length > 1 ? stopIds[stopIds.length - 1] : undefined;

    let suggestedRoutes: string[] = [];
    if (fromStationId && toStationId) {
      const alternatives = await this.findAlternatives(fromStationId, toStationId);
      suggestedRoutes = alternatives.map((alt) => this.formatAlternative(alt));
    }

    if (suggestedRoutes.length === 0) {
      const contextRef = routeId ?? payload.stationId ?? payload.trainId ?? 'desconocido';
      suggestedRoutes = [`No se pudieron calcular alternativas para ${contextRef}`];
    }

    const plan: ReroutePlan = {
      id: this.plans.length + 1,
      incidentId: this.plans.length + 1,
      suggestedRoutes,
      affectedPassengers: 0, // TODO infer affected passengers
      createdAt: new Date().toISOString(),
    };
    this.plans.push(plan);
    return plan;
  }

  private formatAlternative(alternative: RouteAlternative): string {
    const stops = alternative.path.join(' → ');
    return `${stops} (${alternative.totalDurationMinutes} min base + ${Math.round(alternative.totalDelayMinutes)} min retraso estimado)`;
  }

  /**
   * Finds a reroute plan by its id.
   */
  findOne(id: number): ReroutePlan | undefined {
    return this.plans.find((plan) => plan.id === id);
  }

  /**
   * Computes route alternatives between two stations.
   * Incidents and predicted delays are attached to each leg.
   */
  async findAlternatives(fromStationId: string, toStationId: string): Promise<RouteAlternative[]> {
    const routes = await this.routeService.findAll();
    const alternatives = this.routeGraph.findAlternatives(routes, fromStationId, toStationId);

    for (const alternative of alternatives) {
      for (const leg of alternative.legs) {
        await this.enrichLeg(leg);
      }
      alternative.totalDelayMinutes = alternative.legs.reduce(
        (sum, leg) => sum + leg.predictedDelayMinutes,
        0,
      );
      alternative.confidence = alternative.legs.some((leg) => leg.incidents.length > 0) ? 0.6 : 0.9;
    }

    return alternatives;
  }

  private async enrichLeg(leg: RouteLeg): Promise<void> {
    const features = await this.featureAssembler.assemble({
      routeId: leg.routeId,
      stationId: leg.to,
    });
    const prediction = await this.predictionClient.predictDelay(features);
    leg.predictedDelayMinutes = prediction?.estimatedDelayMinutes ?? 0;

    const activeIncidents = await this.incidentClassifier.getActiveIncidentsForRoute(leg.routeId);
    leg.incidents = activeIncidents.map((incident) => ({
      type: incident.incidentType,
      severity: incident.severity,
      description: incident.description,
    }));
  }
}
