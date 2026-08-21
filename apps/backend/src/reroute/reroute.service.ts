import {Inject, Injectable} from '@nestjs/common';
import type {IncidentPayload, ReroutePlan, Route} from '@train-system/shared-types';
import {RouteService} from '../route/route.service';
import {DelayPredictionFeatureAssemblerService} from '../train/delay-prediction-feature-assembler.service';
import {DelayPredictionClientService} from '../train/delay-prediction-client.service';
import {AlertClassifierService} from '../incident/alert-classifier.service';
import {RouteAlternative, RouteGraphService, RouteLeg, RoutingConstraints} from './route-graph.service';

@Injectable()
export class RerouteService {
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
    const routeIds =
      payload.alert?.informedEntity
        ?.map((entity) => entity.routeId)
        .filter((id): id is string => Boolean(id)) ?? [];
    const stopIds =
      payload.alert?.informedEntity?.map((entity) => entity.stopId).filter((id): id is string => Boolean(id)) ?? [];

    const routes = await this.routeService.findAll();
    const affectedRoutes = this.findAffectedRoutes(routes, routeIds, payload.trainId);

    const fromStationId =
      payload.stationId
        ? String(payload.stationId)
        : stopIds[0] ?? affectedRoutes[0]?.originStationId;
    const toStationId = stopIds.length > 1 ? stopIds[stopIds.length - 1] : affectedRoutes[0]?.destinationStationId;

    let suggestedRoutes: string[] = [];
    if (fromStationId && toStationId) {
      const alternatives = await this.findAlternatives(
        fromStationId,
        toStationId,
        {
          blockedRouteIds: this.unique(
            routeIds.concat(
              affectedRoutes.map((route) => route.routeKey ?? route.tripId ?? route.trainId ?? ''),
            ),
          ),
          blockedStationIds: this.unique(
            stopIds.concat(payload.stationId ? [String(payload.stationId)] : []),
          ),
        },
        routes,
      );
      suggestedRoutes = alternatives.map((alt) => this.formatAlternative(alt));
    }

    if (suggestedRoutes.length === 0) {
      const contextRef = routeIds[0] ?? payload.stationId ?? payload.trainId ?? 'desconocido';
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
  async findAlternatives(
    fromStationId: string,
    toStationId: string,
    constraints: RoutingConstraints = {},
    sourceRoutes?: Awaited<ReturnType<RouteService['findAll']>>,
  ): Promise<RouteAlternative[]> {
    const routes = sourceRoutes ?? (await this.routeService.findAll());
    const availabilityConstraints = await this.buildAvailabilityConstraints(routes, constraints);
    const alternatives = this.routeGraph.findAlternatives(
      routes,
      fromStationId,
      toStationId,
      availabilityConstraints,
    );

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

  private async buildAvailabilityConstraints(
    routes: Route[],
    baseConstraints: RoutingConstraints,
  ): Promise<RoutingConstraints> {
    const blockedRouteIds = new Set((baseConstraints.blockedRouteIds ?? []).map((id) => id.toLowerCase()));
    const blockedStationIds = new Set((baseConstraints.blockedStationIds ?? []).map((id) => id.toLowerCase()));

    const activeIncidents = await this.incidentClassifier.getAllActiveIncidents();
    const blockingIncidents = activeIncidents.filter((incident) =>
      this.isAvailabilityBlockingIncident(incident),
    );

    for (const incident of blockingIncidents) {
      for (const stationId of this.incidentStationIds(incident)) {
        blockedStationIds.add(stationId.toLowerCase());
      }

      for (const route of this.findAffectedRoutes(routes, incident.routeIds ?? [], incident.trainId)) {
        for (const identifier of this.routeIdentifiers(route)) {
          blockedRouteIds.add(identifier.toLowerCase());
        }
      }

      if (incident.affectedTrainIds) {
        for (const affectedTrainId of incident.affectedTrainIds) {
          for (const route of this.findAffectedRoutes(routes, [], affectedTrainId)) {
            for (const identifier of this.routeIdentifiers(route)) {
              blockedRouteIds.add(identifier.toLowerCase());
            }
          }
        }
      }
    }

    return {
      blockedRouteIds: Array.from(blockedRouteIds),
      blockedStationIds: Array.from(blockedStationIds),
    };
  }

  private findAffectedRoutes(
    routes: Awaited<ReturnType<RouteService['findAll']>>,
    routeIds: string[],
    trainId?: string | number | null,
  ) {
    const routeIdSet = new Set(routeIds.map((id) => id.toLowerCase()));
    const normalizedTrainId = trainId ? String(trainId).toLowerCase() : null;

    return routes.filter((route) => {
      const identifiers = [route.routeKey, route.tripId, route.trainId]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());
      if (identifiers.some((identifier) => routeIdSet.has(identifier))) {
        return true;
      }
      return normalizedTrainId ? identifiers.includes(normalizedTrainId) : false;
    });
  }

  private routeIdentifiers(route: Route): string[] {
    return [route.routeKey, route.tripId, route.trainId].filter((value): value is string => Boolean(value));
  }

  private incidentStationIds(incident: {
    stationId: string | null;
    affectedStationIds: string[] | null;
    affectedStopIds: string[] | null;
  }): string[] {
    const values = [
      incident.stationId ?? '',
      ...(incident.affectedStationIds ?? []),
      ...(incident.affectedStopIds ?? []),
    ];
    return this.unique(values);
  }

  private isAvailabilityBlockingIncident(incident: {
    incidentType: string | null;
    severity: string | null;
    estimatedDelayMinutes: number | null;
  }): boolean {
    if (incident.severity === 'CRITICAL') {
      return true;
    }

    if (
      incident.incidentType === 'BREAKDOWN' ||
      incident.incidentType === 'ACCIDENT' ||
      incident.incidentType === 'INFRASTRUCTURE' ||
      incident.incidentType === 'STRIKE'
    ) {
      return true;
    }

    return incident.incidentType === 'DELAY' &&
        incident.estimatedDelayMinutes !== null &&
        incident.estimatedDelayMinutes >= 30;
  }

  private unique(values: string[]): string[] {
    return Array.from(new Set(values.filter((value) => Boolean(value))));
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
