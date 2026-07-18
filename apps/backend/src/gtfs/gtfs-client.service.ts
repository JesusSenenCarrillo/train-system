import {Injectable, Logger} from '@nestjs/common';
import {GtfsTripUpdatesFeedDto, GtfsVehiclePositionsFeedDto, LdFleetFeedDto,} from './dto/gtfs-feed.dto';

const GTFS_ENDPOINTS = {
  tripUpdatesLd: 'https://gtfsrt.renfe.com/trip_updates_LD.json',
  tripUpdatesCommuter: 'https://gtfsrt.renfe.com/trip_updates.json',
  vehiclePositionsLd: 'https://gtfsrt.renfe.com/vehicle_positions_LD.json',
  vehiclePositionsCommuter: 'https://gtfsrt.renfe.com/vehicle_positions.json',
  ldFleetBase: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json',
};

@Injectable()
export class GtfsClientService {
  private readonly logger = new Logger(GtfsClientService.name);

  async fetchFeeds(): Promise<{
    tripUpdatesLd: GtfsTripUpdatesFeedDto;
    tripUpdatesCommuter: GtfsTripUpdatesFeedDto;
    vehiclePositionsLd: GtfsVehiclePositionsFeedDto;
    vehiclePositionsCommuter: GtfsVehiclePositionsFeedDto;
    ldFleet: LdFleetFeedDto;
  }> {
    const timestamp = Date.now();
    const ldFleetUrl = `${GTFS_ENDPOINTS.ldFleetBase}?v=${timestamp}`;

    const [
      tripUpdatesLd,
      tripUpdatesCommuter,
      vehiclePositionsLd,
      vehiclePositionsCommuter,
      ldFleet,
    ] = await Promise.all([
      this.fetchJsonOrDefault<GtfsTripUpdatesFeedDto>(GTFS_ENDPOINTS.tripUpdatesLd, { entity: [], header: { gtfsRealtimeVersion: '2.0' } }),
      this.fetchJsonOrDefault<GtfsTripUpdatesFeedDto>(GTFS_ENDPOINTS.tripUpdatesCommuter, { entity: [], header: { gtfsRealtimeVersion: '2.0' } }),
      this.fetchJsonOrDefault<GtfsVehiclePositionsFeedDto>(GTFS_ENDPOINTS.vehiclePositionsLd, { entity: [], header: { gtfsRealtimeVersion: '2.0' } }),
      this.fetchJsonOrDefault<GtfsVehiclePositionsFeedDto>(GTFS_ENDPOINTS.vehiclePositionsCommuter, { entity: [], header: { gtfsRealtimeVersion: '2.0' } }),
      this.fetchJsonOrDefault<LdFleetFeedDto>(ldFleetUrl, { trenes: [] }),
    ]);

    return {
      tripUpdatesLd,
      tripUpdatesCommuter,
      vehiclePositionsLd,
      vehiclePositionsCommuter,
      ldFleet,
    };
  }

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
