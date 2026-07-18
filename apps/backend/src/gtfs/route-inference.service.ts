import {Inject, Injectable} from '@nestjs/common';
import {UpsertInferredRouteDto} from '../route/route.service';
import {NormalizedTripUpdateDto} from './dto/normalized-gtfs.dto';
import {Train} from '@train-system/shared-types';
import {StationService} from '../station/station.service';

@Injectable()
export class RouteInferenceService {
  @Inject(StationService)
  private readonly stationService!: StationService;

  inferRoutes(payload: { tripUpdates: NormalizedTripUpdateDto[]; liveSnapshots: Train[] }): UpsertInferredRouteDto[] {
    const output: UpsertInferredRouteDto[] = [];
    const liveByTripId = new Map<string, Train>();

    for (const snapshot of payload.liveSnapshots) {
      if (snapshot.tripId) {
        liveByTripId.set(snapshot.tripId, snapshot);
      }
    }

    for (const tripUpdate of payload.tripUpdates) {
      const stationPath = this.uniqueStopIds(tripUpdate.stopTimeUpdates.map((stop) => stop.stopId));
      if (stationPath.length < 2) {
        continue;
      }

      const origin = stationPath[0];
      const destination = stationPath[stationPath.length - 1];
      const knownStationsCount = stationPath.filter((stationId) => this.stationService.hasCode(stationId)).length;
      const confidence = stationPath.length > 0 ? knownStationsCount / stationPath.length : 0;
      const live = liveByTripId.get(tripUpdate.tripId);

      output.push({
        routeKey: `${tripUpdate.tripId}:${origin}:${destination}`,
        trainId: live?.trainId ?? null,
        tripId: tripUpdate.tripId,
        originStationId: origin,
        destinationStationId: destination,
        pathStationIds: stationPath,
        durationMinutes: this.estimateDurationMinutes(tripUpdate),
        distanceKm: null,
        trainType: tripUpdate.source,
        confidence,
      });
    }

    return output;
  }

  private uniqueStopIds(stopIds: string[]): string[] {
    const seen = new Set<string>();
    const output: string[] = [];
    for (const stopId of stopIds) {
      if (!stopId || seen.has(stopId)) {
        continue;
      }
      seen.add(stopId);
      output.push(stopId);
    }
    return output;
  }

  private estimateDurationMinutes(tripUpdate: NormalizedTripUpdateDto): number {
    const times = tripUpdate.stopTimeUpdates
      .flatMap((stop) => [stop.arrivalTime, stop.departureTime])
      .filter((time): time is string => Boolean(time))
      .map((time) => new Date(time).getTime())
      .filter((value) => !Number.isNaN(value));

    if (times.length < 2) {
      return 0;
    }

    const min = Math.min(...times);
    const max = Math.max(...times);
    return Math.max(0, Math.round((max - min) / 60000));
  }
}
