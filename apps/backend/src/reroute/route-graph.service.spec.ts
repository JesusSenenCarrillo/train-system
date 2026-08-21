import {Route} from '@train-system/shared-types';
import {RouteGraphService} from './route-graph.service';

describe('RouteGraphService', () => {
  let service: RouteGraphService;

  beforeEach(() => {
    service = new RouteGraphService();
  });

  it('finds a path even when goal station has no outgoing edges', () => {
    const routes: Route[] = [
      makeRoute(1, ['A', 'B', 'C'], 10, {tripId: 'r-1'}),
    ];

    const alternatives = service.findAlternatives(routes, 'A', 'C');

    expect(alternatives.length).toBe(1);
    expect(alternatives[0].path).toEqual(['A', 'B', 'C']);
  });

  it('prefers a non-affected path when affected route identifiers are provided', () => {
    const routes: Route[] = [
      makeRoute(1, ['A', 'B', 'C'], 5, {routeKey: 'affected-route'}),
      makeRoute(2, ['A', 'D', 'C'], 8, {routeKey: 'safe-route'}),
    ];

    const alternatives = service.findAlternatives(routes, 'A', 'C', {
      blockedRouteIds: ['affected-route'],
    });

    expect(alternatives[0].path).toEqual(['A', 'D', 'C']);
  });

  it('avoids stations marked as affected by the incident', () => {
    const routes: Route[] = [
      makeRoute(1, ['A', 'B', 'C'], 5, {tripId: 'r-blocked'}),
      makeRoute(2, ['A', 'D', 'C'], 6, {tripId: 'r-open'}),
    ];

    const alternatives = service.findAlternatives(routes, 'A', 'C', {
      blockedStationIds: ['B'],
    });

    expect(alternatives[0].path).toEqual(['A', 'D', 'C']);
  });
});

function makeRoute(
  id: number,
  pathStationIds: string[],
  duration: number,
  identifiers: {routeKey?: string; tripId?: string},
): Route {
  return {
    id,
    routeKey: identifiers.routeKey,
    tripId: identifiers.tripId ?? null,
    trainId: null,
    originStationId: pathStationIds[0],
    destinationStationId: pathStationIds[pathStationIds.length - 1],
    pathStationIds,
    duration,
    trainType: 'COMMUTER',
    source: 'INFERRED',
    confidence: 0.9,
  };
}
