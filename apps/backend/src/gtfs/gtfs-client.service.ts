import {Injectable, Logger} from '@nestjs/common';
import {
    GtfsTripUpdatesFeedDto,
    GtfsVehiclePositionsFeedDto,
    LdFleetFeedDto,
    LdFleetWithStationsFeedDto,
} from './dto/gtfs-feed.dto';
import {GtfsAlertsFeedDto} from './dto/gtfs-alert.dto';

const GTFS_ENDPOINTS = {
  tripUpdatesLd: 'https://gtfsrt.renfe.com/trip_updates_LD.json',
  tripUpdatesCommuter: 'https://gtfsrt.renfe.com/trip_updates.json',
  vehiclePositionsLd: 'https://gtfsrt.renfe.com/vehicle_positions_LD.json',
  vehiclePositionsCommuter: 'https://gtfsrt.renfe.com/vehicle_positions.json',
  alerts: 'https://gtfsrt.renfe.com/alerts.json',
  ldFleetBase: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json',
  ldFleetWithStationsBase: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json',
};

@Injectable()
export class GtfsClientService {
  private readonly logger = new Logger(GtfsClientService.name);

  /**
   * Fetches all external Renfe feeds in parallel.
   *
   * Long-distance fleet URLs are busted with the current timestamp to avoid stale CDN caches.
   *
   * @returns An object containing trip updates, vehicle positions, and LD fleet feeds for both networks.
   */
  async fetchFeeds(): Promise<{
    tripUpdatesLd: GtfsTripUpdatesFeedDto;
    tripUpdatesCommuter: GtfsTripUpdatesFeedDto;
    vehiclePositionsLd: GtfsVehiclePositionsFeedDto;
    vehiclePositionsCommuter: GtfsVehiclePositionsFeedDto;
    ldFleet: LdFleetFeedDto;
    ldFleetWithStations: LdFleetWithStationsFeedDto;
  }> {
    const timestamp = Date.now();
    const ldFleetUrl = `${GTFS_ENDPOINTS.ldFleetBase}?v=${timestamp}`;
    const ldFleetWithStationsUrl = `${GTFS_ENDPOINTS.ldFleetWithStationsBase}?v=${timestamp}`;

    const [
      tripUpdatesLd,
      tripUpdatesCommuter,
      vehiclePositionsLd,
      vehiclePositionsCommuter,
      ldFleet,
      ldFleetWithStations,
    ] = await Promise.all([
      this.fetchJsonOrDefault<GtfsTripUpdatesFeedDto>(GTFS_ENDPOINTS.tripUpdatesLd, { entity: [], header: { gtfsRealtimeVersion: '2.0' } }),
      this.fetchJsonOrDefault<GtfsTripUpdatesFeedDto>(GTFS_ENDPOINTS.tripUpdatesCommuter, { entity: [], header: { gtfsRealtimeVersion: '2.0' } }),
      this.fetchJsonOrDefault<GtfsVehiclePositionsFeedDto>(GTFS_ENDPOINTS.vehiclePositionsLd, { entity: [], header: { gtfsRealtimeVersion: '2.0' } }),
      this.fetchJsonOrDefault<GtfsVehiclePositionsFeedDto>(GTFS_ENDPOINTS.vehiclePositionsCommuter, { entity: [], header: { gtfsRealtimeVersion: '2.0' } }),
      this.fetchJsonOrDefault<LdFleetFeedDto>(ldFleetUrl, { trenes: [] }),
      this.fetchJsonOrDefault<LdFleetWithStationsFeedDto>(ldFleetWithStationsUrl, { trenes: [] }),
    ]);

    return {
      tripUpdatesLd,
      tripUpdatesCommuter,
      vehiclePositionsLd,
      vehiclePositionsCommuter,
      ldFleet,
      ldFleetWithStations,
    };
  }

  /**
   * Fetches the GTFS-RT alerts feed.
   *
   * @returns The parsed alerts feed, or an empty fallback if the request fails.
   */
  async fetchAlerts(): Promise<GtfsAlertsFeedDto> {
    return this.fetchJsonOrDefault<GtfsAlertsFeedDto>(GTFS_ENDPOINTS.alerts, {
      entity: [],
      header: {gtfsRealtimeVersion: '2.0'},
    });
  }

  /**
   * Fetches JSON from a URL and returns a fallback value on any error.
   *
   * @param url - The URL to fetch.
   * @param fallback - The value to return if the fetch fails.
   * @returns The parsed JSON body, or the fallback value on failure.
   */
  private async fetchJsonOrDefault<T>(url: string, fallback: T): Promise<T> {
    try {
      return await this.fetchJson<T>(url);
    } catch (error: unknown) {
      this.logger.warn(
        error instanceof Error ? error.message : `GTFS fetch failed for ${url}`,
      );
      return fallback;
    }
  }

  /**
   * Performs a GET request with a 12-second timeout and parses the JSON response.
   *
   * @param url - The URL to fetch.
   * @returns The parsed JSON body.
   * @throws Error if the response status is not OK.
   */
  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`GTFS fetch failed (${response.status}) for ${url}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
