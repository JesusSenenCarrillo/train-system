import {Injectable} from '@nestjs/common';
import {ScheduleUpdate, Train} from '@train-system/shared-types';

@Injectable()
export class TrainService {
  private readonly trains: Train[] = [
    {
      id: 1,
      trainId: 'LD-71800',
      source: 'LD',
      serviceType: 'LD',
      tripId: null,
      commercialCode: '71800',
      productCode: 16,
      originStationId: '05193',
      destinationStationId: '21010',
      previousStationId: '05127',
      nextStationId: '05127',
      nextStationArrivalAt: '2026-07-16T09:16',
      currentStopId: null,
      latitude: 43.587063,
      longitude: -7.9344945,
      currentStatus: 'EN_ROUTE',
      delayMinutes: 6,
      delaySeconds: 360,
      updatedAt: 1784186863,
      platform: '4',
      vehicleId: null,
      vehicleLabel: null,
      rollingStock: '527019',
      accessible: false,
      metadata: {
        provider: 'flotaLD',
      },
      raw: {
        codComercial: '71800',
        codEstAnt: '05127',
        codEstSig: '05127',
        horaLlegadaSigEst: '2026-07-16T09:16',
        codProduct: 16,
        codOrigen: '05193',
        codDestino: '21010',
        accesible: false,
        ultRetraso: '6',
        latitud: 43.587063,
        longitud: -7.9344945,
        time: 1784186863,
        p: '4',
        mat: '527019',
      },
    },
    {
      id: 2,
      trainId: 'VP_C4-23615',
      source: 'COMMUTER',
      serviceType: 'COMMUTER',
      tripId: '3094J23615C4',
      commercialCode: null,
      productCode: null,
      originStationId: null,
      destinationStationId: null,
      previousStationId: null,
      nextStationId: null,
      nextStationArrivalAt: null,
      currentStopId: '51110',
      latitude: 37.362885,
      longitude: -5.97583,
      currentStatus: 'STOPPED_AT',
      delayMinutes: 0,
      delaySeconds: 0,
      updatedAt: 1784188688,
      platform: '1',
      vehicleId: '23615',
      vehicleLabel: 'C4-23615-PLATF.(1)',
      rollingStock: null,
      accessible: false,
      metadata: {
        provider: 'gtfs-rt',
      },
      raw: {
        id: 'VP_C4-23615',
        vehicle: {
          trip: {
            tripId: '3094J23615C4',
          },
          position: {
            latitude: 37.362885,
            longitude: -5.97583,
          },
          currentStatus: 'STOPPED_AT',
          timestamp: '1784188688',
          stopId: '51110',
          vehicle: {
            id: '23615',
            label: 'C4-23615-PLATF.(1)',
          },
        },
      },
    },
  ];

  private readonly scheduleUpdates: ScheduleUpdate[] = [
    {
      id: 'TUUPDATE_3094J80903C3',
      tripUpdate: {
        trip: {
          tripId: '3094J80903C3',
          scheduleRelationship: 'SCHEDULED',
        },
        stopTimeUpdate: [
          {
            arrival: {
              delay: 0,
              time: '1784196600',
            },
            stopId: '40113',
          },
        ],
        vehicle: {
          wheelchairAccessible: 'WHEELCHAIR_INACCESSIBLE',
        },
        delay: 0,
      },
    },
  ];

  findAll(): Train[] {
    return this.trains;
  }

  findScheduleUpdates(): ScheduleUpdate[] {
    return this.scheduleUpdates;
  }
}
