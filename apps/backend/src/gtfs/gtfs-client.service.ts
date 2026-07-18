import {Injectable} from '@nestjs/common';
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
  async fetchFeeds(): Promise<{
    tripUpdatesLd: GtfsTripUpdatesFeedDto;
    tripUpdatesCommuter: GtfsTripUpdatesFeedDto;
    vehiclePositionsLd: GtfsVehiclePositionsFeedDto;
    vehiclePositionsCommuter: GtfsVehiclePositionsFeedDto;
    ldFleet: LdFleetFeedDto;
  }> {
    const timestamp = Date.now();
    const ldFleetUrl = `${GTFS_ENDPOINTS.ldFleetBase}?v=${timestamp}`;

    const [tripUpdatesLd, tripUpdatesCommuter, vehiclePositionsLd, vehiclePositionsCommuter, ldFleet] = await Promise.all([
      this.fetchJson<GtfsTripUpdatesFeedDto>(GTFS_ENDPOINTS.tripUpdatesLd),
      this.fetchJson<GtfsTripUpdatesFeedDto>(GTFS_ENDPOINTS.tripUpdatesCommuter),
      this.fetchJson<GtfsVehiclePositionsFeedDto>(GTFS_ENDPOINTS.vehiclePositionsLd),
      this.fetchJson<GtfsVehiclePositionsFeedDto>(GTFS_ENDPOINTS.vehiclePositionsCommuter),
      this.fetchJson<LdFleetFeedDto>(ldFleetUrl),
    ]);

    return {
      tripUpdatesLd,
      tripUpdatesCommuter,
      vehiclePositionsLd,
      vehiclePositionsCommuter,
      ldFleet,
    };
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
