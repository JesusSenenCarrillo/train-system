import {Injectable} from '@nestjs/common';
import {
  GtfsTripUpdatesFeedDto,
  GtfsVehiclePositionsFeedDto,
  LdFleetFeedDto,
  LdFleetTrainDto,
} from './dto/gtfs-feed.dto';
import {
  IngestionPayloadBundleDto,
  NormalizedTripUpdateDto,
  NormalizedVehiclePositionDto,
} from './dto/normalized-gtfs.dto';
import {Train} from '@train-system/shared-types';
import {CreateStopEventDto} from '../train/dto/create-stop-event.dto';
import {toIso, toMadridLocalIso, trimStationId} from "@train-system/utils";

@Injectable()
export class GtfsNormalizerService {
  /**
   * Normalizes raw Renfe feeds into a unified ingestion bundle.
   *
   * Trip updates and vehicle positions are normalized for both LD and commuter networks,
   * then cross-referenced to produce live train snapshots and stop events.
   *
   * @param input - The raw feeds from {@link GtfsClientService.fetchFeeds}.
   * @returns A bundle with live snapshots, stop events, and normalized trip updates.
   */
  normalizeFeeds(input: {
    tripUpdatesLd: GtfsTripUpdatesFeedDto;
    tripUpdatesCommuter: GtfsTripUpdatesFeedDto;
    vehiclePositionsLd: GtfsVehiclePositionsFeedDto;
    vehiclePositionsCommuter: GtfsVehiclePositionsFeedDto;
    ldFleet: LdFleetFeedDto;
  }): IngestionPayloadBundleDto {
    const tripUpdatesLd = this.normalizeTripUpdates(input.tripUpdatesLd, 'LD');
    const tripUpdatesCommuter = this.normalizeTripUpdates(input.tripUpdatesCommuter, 'COMMUTER');
    const allTripUpdates = [...tripUpdatesLd, ...tripUpdatesCommuter];

    const tripLookup = new Map(allTripUpdates.map((update) => [update.tripId, update]));
    const ldFleetByCommercialCode = this.buildLdFleetIndex(input.ldFleet);

    const ldLive = this.normalizeVehiclePositions(input.vehiclePositionsLd, 'LD', tripLookup, ldFleetByCommercialCode);
    const commuterLive = this.normalizeVehiclePositions(
      input.vehiclePositionsCommuter,
      'COMMUTER',
      tripLookup,
      ldFleetByCommercialCode,
    );
    const allLive = [...ldLive, ...commuterLive];

    const tripToTrainMap = new Map<string, string>();
    for (const live of allLive) {
      if (live.tripId) {
        tripToTrainMap.set(live.tripId, live.trainId);
      }
    }

    return {
      liveSnapshots: allLive.map((live) => this.toTrainSnapshot(live, tripLookup, ldFleetByCommercialCode)),
      stopEvents: this.toStopEvents(allTripUpdates, tripToTrainMap),
      normalizedTripUpdates: allTripUpdates,
    };
  }

  /**
   * Normalizes a GTFS-RT trip updates feed into a consistent DTO structure.
   *
   * @param feed - The raw trip updates feed.
   * @param source - Whether the feed belongs to the LD or commuter network.
   * @returns A list of normalized trip updates with trimmed stop-time entries.
   */
  private normalizeTripUpdates(
    feed: GtfsTripUpdatesFeedDto,
    source: 'LD' | 'COMMUTER',
  ): NormalizedTripUpdateDto[] {
    const entities = feed.entity ?? [];
    const output: NormalizedTripUpdateDto[] = [];

    for (const entity of entities) {
      const tripId = entity.tripUpdate?.trip?.tripId;
      if (!tripId) {
        continue;
      }

      const stopTimeUpdates = (entity.tripUpdate?.stopTimeUpdate ?? [])
        .map((stop) => {
          if (!stop.stopId) {
            return null;
          }
          return {
            stopId: stop.stopId,
            scheduleRelationship: stop.scheduleRelationship ?? null,
            arrivalTime: toIso(stop.arrival?.time),
            arrivalDelaySeconds: stop.arrival?.delay ?? null,
            departureTime: toIso(stop.departure?.time),
            departureDelaySeconds: stop.departure?.delay ?? null,
          };
        })
        .filter((value): value is NonNullable<typeof value> => value !== null);

      output.push({
        source,
        entityId: entity.id,
        tripId,
        routeId: entity.tripUpdate?.trip?.routeId ?? null,
        scheduleRelationship: entity.tripUpdate?.trip?.scheduleRelationship ?? 'SCHEDULED',
        delaySeconds: entity.tripUpdate?.delay ?? null,
        wheelchairAccessible: entity.tripUpdate?.vehicle?.wheelchairAccessible ?? null,
        stopTimeUpdates,
      });
    }

    return output;
  }

  /**
   * Normalizes a GTFS-RT vehicle positions feed.
   *
   * For LD trains the commercial code is inferred from the vehicle or trip id and enriched
   * with the LD fleet feed. For commuter trains the raw vehicle id is used directly.
   *
   * @param feed - The raw vehicle positions feed.
   * @param source - Whether the feed belongs to the LD or commuter network.
   * @param tripLookup - Map of trip id to its normalized trip update.
   * @param ldFleetByCommercialCode - Map of commercial code to LD fleet metadata.
   * @returns A list of normalized vehicle positions.
   */
  private normalizeVehiclePositions(
    feed: GtfsVehiclePositionsFeedDto,
    source: 'LD' | 'COMMUTER',
    tripLookup: Map<string, NormalizedTripUpdateDto>,
    ldFleetByCommercialCode: Map<string, LdFleetTrainDto>,
  ): NormalizedVehiclePositionDto[] {
    const entities = feed.entity ?? [];
    const output: NormalizedVehiclePositionDto[] = [];

    for (const entity of entities) {
      const latitude = entity.vehicle?.position?.latitude;
      const longitude = entity.vehicle?.position?.longitude;
      if (latitude === undefined || longitude === undefined) {
        continue;
      }

      const tripId = entity.vehicle?.trip?.tripId ?? null;
      const rawVehicleId = entity.vehicle?.vehicle?.id ?? null;
      const inferredVehicleId = rawVehicleId ?? this.extractLeadingDigits(tripId);
      const commercialCode = source === 'LD' ? inferredVehicleId : null;
      const ldFleetTrain = commercialCode ? ldFleetByCommercialCode.get(commercialCode) : null;

      const trainId =
        source === 'LD'
          ? `LD-${inferredVehicleId ?? entity.id.replace('VP_', '')}`
          : `COMMUTER-${rawVehicleId ?? entity.id.replace('VP_', '')}`;

      const updateTimestamp = Number(entity.vehicle?.timestamp ?? ldFleetTrain?.time ?? Math.floor(Date.now() / 1000));
      const tripUpdate = tripId ? tripLookup.get(tripId) : undefined;
      const fallbackStopId = tripUpdate?.stopTimeUpdates[0]?.stopId ?? null;

      output.push({
        source,
        entityId: entity.id,
        trainId,
        tripId,
        stopId: entity.vehicle?.stopId ?? ldFleetTrain?.codEstSig ?? fallbackStopId,
        latitude,
        longitude,
        currentStatus: entity.vehicle?.currentStatus ?? 'IN_TRANSIT_TO',
        updatedAt: updateTimestamp,
        vehicleId: rawVehicleId,
        vehicleLabel: entity.vehicle?.vehicle?.label ?? null,
      });
    }

    return output;
  }

  /**
   * Builds a domain {@link Train} snapshot from a normalized vehicle position.
   *
   * Enrichment priority: LD fleet feed first, then GTFS trip update, then raw vehicle data.
   *
   * @param live - The normalized vehicle position.
   * @param tripLookup - Map of trip id to its normalized trip update.
   * @param ldFleetByCommercialCode - Map of commercial code to LD fleet metadata.
   * @returns A fully populated train snapshot ready for persistence.
   */
  private toTrainSnapshot(
    live: NormalizedVehiclePositionDto,
    tripLookup: Map<string, NormalizedTripUpdateDto>,
    ldFleetByCommercialCode: Map<string, LdFleetTrainDto>,
  ): Train {
    const tripUpdate = live.tripId ? tripLookup.get(live.tripId) : undefined;
    const ldFleetTrain = live.source === 'LD' ? ldFleetByCommercialCode.get(live.vehicleId ?? '') : undefined;
    const firstStop = tripUpdate?.stopTimeUpdates[0];
    const lastStop = tripUpdate?.stopTimeUpdates[tripUpdate.stopTimeUpdates.length - 1];

    const delaySeconds =
      tripUpdate?.delaySeconds ??
      (ldFleetTrain?.ultRetraso !== undefined ? Number(ldFleetTrain.ultRetraso) * 60 : 0);

    return {
      trainId: live.trainId,
      source: live.source,
      serviceType: live.source,
      tripId: live.tripId,
      commercialCode: ldFleetTrain?.codComercial ?? null,
      productCode: ldFleetTrain?.codProduct ?? null,
      originStationId: trimStationId(ldFleetTrain?.codOrigen ?? firstStop?.stopId ?? null),
      destinationStationId: trimStationId(ldFleetTrain?.codDestino ?? lastStop?.stopId ?? null),
      previousStationId: trimStationId(ldFleetTrain?.codEstAnt ?? null),
      nextStationId: trimStationId(ldFleetTrain?.codEstSig ?? firstStop?.stopId ?? null),
      nextStationArrivalAt: ldFleetTrain?.horaLlegadaSigEst
        ? toMadridLocalIso(ldFleetTrain.horaLlegadaSigEst)
        : null,
      currentStopId: live.stopId,
      latitude: live.latitude,
      longitude: live.longitude,
      currentStatus: live.currentStatus,
      delayMinutes: Math.round((delaySeconds ?? 0) / 60),
      delaySeconds: delaySeconds ?? 0,
      updatedAt: live.updatedAt,
      platform: ldFleetTrain?.p ?? null,
      vehicleId: live.vehicleId,
      vehicleLabel: live.vehicleLabel,
      rollingStock: ldFleetTrain?.mat ?? null,
      accessible: ldFleetTrain?.accesible ?? false,
      metadata: {
        tripUpdateEntityId: tripUpdate?.entityId ?? null,
        wheelchairAccessible: tripUpdate?.wheelchairAccessible ?? null,
      },
      raw: {
        vehicleEntityId: live.entityId,
        tripId: live.tripId,
      },
    };
  }

  /**
   * Converts normalized trip updates into arrival and departure stop events.
   *
   * Skips stops marked as `SKIPPED`. Each stop with an arrival or departure time produces
   * a distinct event linked to the train id resolved from the live snapshots.
   *
   * @param updates - The normalized trip updates.
   * @param tripToTrainMap - Map of trip id to resolved train id.
   * @returns A list of stop events ready for persistence.
   */
  private toStopEvents(
    updates: NormalizedTripUpdateDto[],
    tripToTrainMap: Map<string, string>,
  ): CreateStopEventDto[] {
    const output: CreateStopEventDto[] = [];

    for (const update of updates) {
      const trainId = tripToTrainMap.get(update.tripId) ?? `TRIP-${update.tripId}`;

      for (const stopUpdate of update.stopTimeUpdates) {
        if (stopUpdate.scheduleRelationship === 'SKIPPED') {
          continue;
        }

        if (stopUpdate.arrivalTime) {
          output.push({
            trainId,
            stationId: trimStationId(stopUpdate.stopId)!,
            tripId: update.tripId,
            routeId: update.routeId,
            eventType: 'ARRIVAL',
            occurredAt: stopUpdate.arrivalTime,
            delaySeconds: stopUpdate.arrivalDelaySeconds,
            source: 'GTFS_RT',
            metadata: {
              source: update.source,
              scheduleRelationship: stopUpdate.scheduleRelationship,
              entityId: update.entityId,
            },
          });
        }

        if (stopUpdate.departureTime) {
          output.push({
            trainId,
            stationId: trimStationId(stopUpdate.stopId)!,
            tripId: update.tripId,
            routeId: update.routeId,
            eventType: 'DEPARTURE',
            occurredAt: stopUpdate.departureTime,
            delaySeconds: stopUpdate.departureDelaySeconds,
            source: 'GTFS_RT',
            metadata: {
              source: update.source,
              scheduleRelationship: stopUpdate.scheduleRelationship,
              entityId: update.entityId,
            },
          });
        }
      }
    }

    return output;
  }

  /**
   * Indexes the LD fleet feed by commercial code for fast lookup during normalization.
   *
   * @param feed - The LD fleet feed.
   * @returns A map from commercial code to fleet train record.
   */
  private buildLdFleetIndex(feed: LdFleetFeedDto): Map<string, LdFleetTrainDto> {
    const map = new Map<string, LdFleetTrainDto>();
    for (const train of feed.trenes ?? []) {
      if (train.codComercial) {
        map.set(train.codComercial, train);
      }
    }
    return map;
  }

  /**
   * Extracts the first run of 4 to 6 leading digits from a string.
   *
   * Used to infer a commercial train code from a raw vehicle or trip identifier.
   *
   * @param value - The raw identifier, which may be `null`.
   * @returns The matched digit sequence, or `null` if no match is found.
   */
  private extractLeadingDigits(value: string | null): string | null {
    if (!value) {
      return null;
    }
    const match = value.match(/^(\d{4,6})/);
    return match ? match[1] : null;
  }
}
