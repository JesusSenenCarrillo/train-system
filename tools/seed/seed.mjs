import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const outputDir = path.resolve('tools/seed/output');
mkdirSync(outputDir, { recursive: true });

const seed = {
  stations: [
    { id: 1, name: 'Madrid Puerta de Atocha', lat: 40.4068, lng: -3.6892, code: 'MAD', city: 'Madrid' },
    { id: 2, name: 'Barcelona Sants', lat: 41.3797, lng: 2.1392, code: 'BCN', city: 'Barcelona' },
    { id: 3, name: 'Sevilla Santa Justa', lat: 37.3925, lng: -5.9761, code: 'SVQ', city: 'Sevilla' },
    { id: 4, name: 'Valencia Joaquin Sorolla', lat: 39.4667, lng: -0.3774, code: 'VLC', city: 'Valencia' },
    { id: 5, name: 'Zaragoza Delicias', lat: 41.6612, lng: -0.8992, code: 'ZAZ', city: 'Zaragoza' },
    { id: 6, name: 'Málaga María Zambrano', lat: 36.7111, lng: -4.4322, code: 'AGP', city: 'Málaga' },
    { id: 7, name: 'Alicante Terminal', lat: 38.3430, lng: -0.4815, code: 'ALC', city: 'Alicante' },
    { id: 8, name: 'Bilbao Abando', lat: 43.2627, lng: -2.9253, code: 'BIO', city: 'Bilbao' },
    { id: 9, name: 'Santander', lat: 43.4242, lng: -3.8219, code: 'SAN', city: 'Santander' },
    { id: 10, name: 'Pamplona', lat: 42.8125, lng: -1.6458, code: 'PNA', city: 'Pamplona' }
  ],
  routes: [
    { id: 1, originStationId: 1, destinationStationId: 2, duration: 120, distance: 620, trainType: 'AVE' },
    { id: 2, originStationId: 1, destinationStationId: 3, duration: 180, distance: 390, trainType: 'AVE' },
    { id: 3, originStationId: 1, destinationStationId: 4, duration: 150, distance: 350, trainType: 'AVE' }
  ],
  trains: [
    { id: 1, name: 'AVE Madrid-Barcelona', type: 'AVE', capacity: 450, status: 'on_time' },
    { id: 2, name: 'AVE Madrid-Sevilla', type: 'AVE', capacity: 430, status: 'delayed' }
  ]
};

writeFileSync(path.join(outputDir, 'seed.json'), JSON.stringify(seed, null, 2));
console.log('Seed data generated at tools/seed/output/seed.json');
