import {Injectable} from '@nestjs/common';
import {Route} from '@train-system/shared-types';

export interface RouteAlternative {
  path: string[];
  totalDurationMinutes: number;
  totalDelayMinutes: number;
  confidence: number;
  legs: RouteLeg[];
}

export interface RouteLeg {
  from: string;
  to: string;
  routeId: string;
  durationMinutes: number;
  predictedDelayMinutes: number;
  incidents: {type: string | null; severity: string | null; description: string}[];
}

@Injectable()
export class RouteGraphService {
  /**
   * Computes up to two route alternatives between two stations using Dijkstra.
   * The second alternative avoids edges used by the first path.
   */
  findAlternatives(routes: Route[], fromStationId: string, toStationId: string): RouteAlternative[] {
    const edges = this.buildEdges(routes);
    const directPath = this.dijkstra(edges, fromStationId, toStationId);

    const alternatives: RouteAlternative[] = [];

    if (directPath && directPath.path.length >= 2) {
      const legs = this.buildLegs(directPath.path, routes);
      alternatives.push(this.toAlternative(legs));
    }

    const penalizedEdges = this.buildEdges(routes, directPath?.path);
    const altPath = this.dijkstra(penalizedEdges, fromStationId, toStationId);

    if (altPath && altPath.path.length >= 2) {
      const directKey = directPath?.path.join('|');
      const altKey = altPath.path.join('|');
      if (altKey !== directKey) {
        const legs = this.buildLegs(altPath.path, routes);
        alternatives.push(this.toAlternative(legs));
      }
    }

    return alternatives.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
  }

  private buildEdges(routes: Route[], avoidPath?: string[]): Map<string, Map<string, number>> {
    const edges = new Map<string, Map<string, number>>();

    for (const route of routes) {
      const path = route.pathStationIds;
      if (path.length < 2) {
        continue;
      }

      for (let i = 0; i < path.length - 1; i += 1) {
        const from = path[i];
        const to = path[i + 1];
        if (!edges.has(from)) {
          edges.set(from, new Map());
        }

        const existing = edges.get(from)!.get(to);
        const cost = this.edgeCost(route, avoidPath);
        if (existing === undefined || cost < existing) {
          edges.get(from)!.set(to, cost);
        }
      }
    }

    return edges;
  }

  private dijkstra(
    edges: Map<string, Map<string, number>>,
    start: string,
    goal: string,
  ): {path: string[]; cost: number} | undefined {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | undefined>();
    const unvisited = new Set<string>();

    for (const node of edges.keys()) {
      distances.set(node, Infinity);
      previous.set(node, undefined);
      unvisited.add(node);
    }
    if (!distances.has(start)) {
      return undefined;
    }

    distances.set(start, 0);

    while (unvisited.size > 0) {
      let current: string | undefined;
      let smallest = Infinity;
      for (const node of unvisited) {
        const distance = distances.get(node) ?? Infinity;
        if (distance < smallest) {
          smallest = distance;
          current = node;
        }
      }

      if (current === undefined || smallest === Infinity) {
        break;
      }

      unvisited.delete(current);

      if (current === goal) {
        const path: string[] = [];
        let step: string | undefined = goal;
        while (step !== undefined) {
          path.unshift(step);
          step = previous.get(step);
        }
        return {path, cost: smallest};
      }

      const neighbors = edges.get(current) ?? new Map();
      for (const [neighbor, weight] of neighbors) {
        if (!unvisited.has(neighbor)) {
          continue;
        }
        const alt = smallest + weight;
        if (alt < (distances.get(neighbor) ?? Infinity)) {
          distances.set(neighbor, alt);
          previous.set(neighbor, current);
        }
      }
    }

    return undefined;
  }

  private edgeCost(route: Route, avoidPath?: string[]): number {
    let cost = route.duration > 0 ? route.duration : 1;

    if (route.source === 'INFERRED') {
      cost += Math.round((1 - (route.confidence ?? 0.5)) * 10);
    }

    if (avoidPath && avoidPath.length >= 2) {
      for (let i = 0; i < avoidPath.length - 1; i += 1) {
        const from = avoidPath[i];
        const to = avoidPath[i + 1];
        if (route.pathStationIds.includes(from) && route.pathStationIds.includes(to)) {
          const fromIdx = route.pathStationIds.indexOf(from);
          const toIdx = route.pathStationIds.indexOf(to);
          if (Math.abs(fromIdx - toIdx) === 1) {
            cost += 60;
          }
        }
      }
    }

    return cost;
  }

  private buildLegs(path: string[], routes: Route[]): RouteLeg[] {
    const legs: RouteLeg[] = [];

    for (let i = 0; i < path.length - 1; i += 1) {
      const from = path[i];
      const to = path[i + 1];
      const legRoute = this.findBestLegRoute(from, to, routes);

      legs.push({
        from,
        to,
        routeId: legRoute?.tripId ?? legRoute?.trainId ?? `${from}->${to}`,
        durationMinutes: legRoute?.duration ?? 0,
        predictedDelayMinutes: 0,
        incidents: [],
      });
    }

    return legs;
  }

  private findBestLegRoute(from: string, to: string, routes: Route[]): Route | undefined {
    const candidates = routes.filter((route) => {
      const path = route.pathStationIds;
      const fromIdx = path.indexOf(from);
      const toIdx = path.indexOf(to);
      return fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx;
    });

    return candidates.sort((a, b) => {
      const aDirect = a.pathStationIds.indexOf(from) + 1 === a.pathStationIds.indexOf(to);
      const bDirect = b.pathStationIds.indexOf(from) + 1 === b.pathStationIds.indexOf(to);
      if (aDirect && !bDirect) return -1;
      if (!aDirect && bDirect) return 1;
      return (a.duration ?? 0) - (b.duration ?? 0);
    })[0];
  }

  private toAlternative(legs: RouteLeg[]): RouteAlternative {
    const totalDurationMinutes = legs.reduce((sum, leg) => sum + leg.durationMinutes, 0);
    const totalDelayMinutes = legs.reduce((sum, leg) => sum + leg.predictedDelayMinutes, 0);
    const confidence = legs.length > 0 ? 0.85 : 0.5;

    return {
      path: legs.map((leg) => leg.from).concat(legs[legs.length - 1]?.to ?? []),
      totalDurationMinutes,
      totalDelayMinutes,
      confidence,
      legs,
    };
  }
}
