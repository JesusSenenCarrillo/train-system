import { Injectable } from '@nestjs/common';
import { Route } from '@train-system/shared-types';

@Injectable()
export class RouteService {
  private readonly routes: Route[] = [
    { id: 1, originStationId: 1, destinationStationId: 2, duration: 120, distance: 620, trainType: 'AVE' },
    { id: 2, originStationId: 1, destinationStationId: 3, duration: 180, distance: 390, trainType: 'AVE' },
    { id: 3, originStationId: 1, destinationStationId: 4, duration: 150, distance: 350, trainType: 'AVE' },
    { id: 4, originStationId: 1, destinationStationId: 5, duration: 95, distance: 260, trainType: 'Avlo' },
    { id: 5, originStationId: 2, destinationStationId: 4, duration: 140, distance: 303, trainType: 'Euromed' },
    { id: 6, originStationId: 2, destinationStationId: 5, duration: 105, distance: 290, trainType: 'Avlo' },
    { id: 7, originStationId: 3, destinationStationId: 6, duration: 130, distance: 210, trainType: 'AVE' },
    { id: 8, originStationId: 3, destinationStationId: 14, duration: 80, distance: 150, trainType: 'Intercity' },
    { id: 9, originStationId: 4, destinationStationId: 1, duration: 150, distance: 350, trainType: 'AVE' },
    { id: 10, originStationId: 4, destinationStationId: 2, duration: 140, distance: 303, trainType: 'Euromed' },
    { id: 11, originStationId: 4, destinationStationId: 6, duration: 160, distance: 410, trainType: 'AVE' },
    { id: 12, originStationId: 5, destinationStationId: 1, duration: 95, distance: 260, trainType: 'Avlo' },
    { id: 13, originStationId: 5, destinationStationId: 2, duration: 105, distance: 290, trainType: 'Avlo' },
    { id: 14, originStationId: 6, destinationStationId: 3, duration: 130, distance: 210, trainType: 'AVE' },
    { id: 15, originStationId: 6, destinationStationId: 1, duration: 165, distance: 430, trainType: 'AVE' },
    { id: 16, originStationId: 7, destinationStationId: 1, duration: 140, distance: 360, trainType: 'Avant' },
    { id: 17, originStationId: 7, destinationStationId: 4, duration: 135, distance: 320, trainType: 'Avant' },
    { id: 18, originStationId: 8, destinationStationId: 1, duration: 180, distance: 420, trainType: 'Alvia' },
    { id: 19, originStationId: 8, destinationStationId: 10, duration: 110, distance: 180, trainType: 'Alvia' },
    { id: 20, originStationId: 10, destinationStationId: 8, duration: 110, distance: 180, trainType: 'Alvia' },
    { id: 21, originStationId: 10, destinationStationId: 11, duration: 85, distance: 150, trainType: 'Intercity' },
    { id: 22, originStationId: 11, destinationStationId: 1, duration: 105, distance: 200, trainType: 'Intercity' },
    { id: 23, originStationId: 11, destinationStationId: 13, duration: 70, distance: 110, trainType: 'Avant' },
    { id: 24, originStationId: 12, destinationStationId: 11, duration: 75, distance: 110, trainType: 'Avant' },
    { id: 25, originStationId: 13, destinationStationId: 1, duration: 80, distance: 120, trainType: 'Avant' },
    { id: 26, originStationId: 13, destinationStationId: 15, duration: 85, distance: 130, trainType: 'Avant' },
    { id: 27, originStationId: 14, destinationStationId: 1, duration: 120, distance: 250, trainType: 'Intercity' },
    { id: 28, originStationId: 14, destinationStationId: 3, duration: 80, distance: 150, trainType: 'Intercity' },
    { id: 29, originStationId: 15, destinationStationId: 16, duration: 90, distance: 140, trainType: 'Intercity' },
    { id: 30, originStationId: 16, destinationStationId: 4, duration: 115, distance: 220, trainType: 'Intercity' },
    { id: 31, originStationId: 16, destinationStationId: 7, duration: 95, distance: 170, trainType: 'Intercity' },
    { id: 32, originStationId: 17, destinationStationId: 2, duration: 100, distance: 170, trainType: 'Regional' },
    { id: 33, originStationId: 17, destinationStationId: 18, duration: 70, distance: 90, trainType: 'Regional' },
    { id: 34, originStationId: 18, destinationStationId: 19, duration: 60, distance: 80, trainType: 'Regional' },
    { id: 35, originStationId: 19, destinationStationId: 2, duration: 85, distance: 120, trainType: 'Regional' },
    { id: 36, originStationId: 19, destinationStationId: 17, duration: 60, distance: 80, trainType: 'Regional' },
    { id: 37, originStationId: 2, destinationStationId: 18, duration: 80, distance: 100, trainType: 'Regional' },
    { id: 38, originStationId: 2, destinationStationId: 19, duration: 90, distance: 130, trainType: 'Regional' },
    { id: 39, originStationId: 3, destinationStationId: 16, duration: 100, distance: 180, trainType: 'Regional' },
    { id: 40, originStationId: 16, destinationStationId: 3, duration: 100, distance: 180, trainType: 'Regional' }
  ];

  findAll(): Route[] {
    return this.routes;
  }
}
