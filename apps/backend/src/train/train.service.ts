import { Injectable } from '@nestjs/common';
import { Train } from '@train-system/shared-types';

@Injectable()
export class TrainService {
  private readonly trains: Train[] = [
    { id: 1, name: 'AVE Madrid-Barcelona', type: 'AVE', capacity: 450, status: 'on_time' },
    { id: 2, name: 'AVE Madrid-Sevilla', type: 'AVE', capacity: 430, status: 'delayed' },
    { id: 3, name: 'Alvia Valencia-Madrid', type: 'Alvia', capacity: 320, status: 'on_time' },
    { id: 4, name: 'Avlo Barcelona-Valencia', type: 'Avlo', capacity: 300, status: 'on_time' },
    { id: 5, name: 'Intercity Zaragoza-Madrid', type: 'Intercity', capacity: 280, status: 'on_time' },
    { id: 6, name: 'AVE Málaga-Madrid', type: 'AVE', capacity: 410, status: 'on_time' },
    { id: 7, name: 'Avant Alicante-Madrid', type: 'Avant', capacity: 260, status: 'delayed' },
    { id: 8, name: 'Alvia Bilbao-Madrid', type: 'Alvia', capacity: 300, status: 'on_time' },
    { id: 9, name: 'AVE Madrid-Barcelona', type: 'AVE', capacity: 440, status: 'on_time' },
    { id: 10, name: 'Euromed Valencia-Barcelona', type: 'Euromed', capacity: 350, status: 'on_time' },
    { id: 11, name: 'Avant Madrid-Toledo', type: 'Avant', capacity: 230, status: 'on_time' },
    { id: 12, name: 'Intercity Madrid-Córdoba', type: 'Intercity', capacity: 290, status: 'on_time' },
    { id: 13, name: 'AVE Madrid-Murcia', type: 'AVE', capacity: 420, status: 'on_time' },
    { id: 14, name: 'AVE Barcelona-Málaga', type: 'AVE', capacity: 410, status: 'delayed' },
    { id: 15, name: 'Avlo Madrid-Zaragoza', type: 'Avlo', capacity: 290, status: 'on_time' }
  ];

  findAll(): Train[] {
    return this.trains;
  }
}
