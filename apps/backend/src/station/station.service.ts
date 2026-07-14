import { Injectable } from '@nestjs/common';
import { Station } from '@train-system/shared-types';

@Injectable()
export class StationService {
  private readonly stations: Station[] = [
    { id: 1, name: 'Madrid Puerta de Atocha', lat: 40.4068, lng: -3.6892, code: 'MAD', city: 'Madrid' },
    { id: 2, name: 'Barcelona Sants', lat: 41.3797, lng: 2.1392, code: 'BCN', city: 'Barcelona' },
    { id: 3, name: 'Sevilla Santa Justa', lat: 37.3925, lng: -5.9761, code: 'SVQ', city: 'Sevilla' },
    { id: 4, name: 'Valencia Joaquin Sorolla', lat: 39.4667, lng: -0.3774, code: 'VLC', city: 'Valencia' },
    { id: 5, name: 'Zaragoza Delicias', lat: 41.6612, lng: -0.8992, code: 'ZAZ', city: 'Zaragoza' },
    { id: 6, name: 'Málaga María Zambrano', lat: 36.7111, lng: -4.4322, code: 'AGP', city: 'Málaga' },
    { id: 7, name: 'Alicante Terminal', lat: 38.3430, lng: -0.4815, code: 'ALC', city: 'Alicante' },
    { id: 8, name: 'Bilbao Abando', lat: 43.2627, lng: -2.9253, code: 'BIO', city: 'Bilbao' },
    { id: 9, name: 'Santander', lat: 43.4242, lng: -3.8219, code: 'SAN', city: 'Santander' },
    { id: 10, name: 'Pamplona', lat: 42.8125, lng: -1.6458, code: 'PNA', city: 'Pamplona' },
    { id: 11, name: 'Valladolid', lat: 41.6518, lng: -4.7286, code: 'VLL', city: 'Valladolid' },
    { id: 12, name: 'Salamanca', lat: 40.9635, lng: -5.6697, code: 'SLM', city: 'Salamanca' },
    { id: 13, name: 'Toledo', lat: 39.8576, lng: -4.0228, code: 'TOL', city: 'Toledo' },
    { id: 14, name: 'Córdoba', lat: 37.8916, lng: -4.7641, code: 'COR', city: 'Córdoba' },
    { id: 15, name: 'Albacete', lat: 38.9958, lng: -1.8560, code: 'ABC', city: 'Albacete' },
    { id: 16, name: 'Murcia', lat: 37.9794, lng: -1.1307, code: 'MUR', city: 'Murcia' },
    { id: 17, name: 'Lleida', lat: 41.6176, lng: 0.6200, code: 'ILD', city: 'Lleida' },
    { id: 18, name: 'Girona', lat: 41.9794, lng: 2.8214, code: 'GIR', city: 'Girona' },
    { id: 19, name: 'Tarragona', lat: 41.1187, lng: 1.2445, code: 'TAR', city: 'Tarragona' },
    { id: 20, name: 'Huelva', lat: 37.2584, lng: -6.9563, code: 'HUV', city: 'Huelva' }
  ];

  findAll(): Station[] {
    return this.stations;
  }
}
