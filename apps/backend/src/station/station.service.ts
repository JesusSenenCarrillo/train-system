import {Injectable, OnModuleInit} from '@nestjs/common';
import {Station} from '@train-system/shared-types';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import * as path from 'node:path';

interface StationJsonRecord {
  fields: Array<{
    type: string;
    id: string;
    info?: {
      notes?: string;
      type_override?: string;
      label?: string;
    };
  }>;
  records: Array<Array<string | number>>;
}

interface ParsedStationJsonRow {
  code: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
}

@Injectable()
export class StationService implements OnModuleInit {
  private stations: Station[] = [];
  private stationByCode: Map<string, Station> = new Map();

  async onModuleInit(): Promise<void> {
    await this.loadStationsFromJson();
  }

  findAll(): Station[] {
    return this.stations;
  }

  findByCode(code: string): Station | undefined {
    return this.stationByCode.get(code);
  }

  hasCode(code: string): boolean {
    return this.stationByCode.has(code);
  }

  private async loadStationsFromJson(): Promise<void> {
    const stationsPath = this.resolveStationsFilePath();
    const buffer = await readFile(stationsPath);
    const raw = buffer.toString('utf-8');

    let jsonData: StationJsonRecord;
    try {
      jsonData = JSON.parse(raw);
    } catch (error) {
      console.error('Failed to parse stations JSON:', error);
      this.stations = [];
      this.stationByCode.clear();
      return;
    }

    if (!jsonData.records || jsonData.records.length === 0) {
      this.stations = [];
      this.stationByCode.clear();
      return;
    }

    // Build a field name -> index map from the fields array
    const fieldIndexMap = new Map<string, number>();
    for (let i = 0; i < jsonData.fields.length; i++) {
      fieldIndexMap.set(jsonData.fields[i].id, i);
    }

    const rows = jsonData.records
        .map((record) => this.parseStationRow(record, fieldIndexMap))
        .filter((row) => row !== null);

    this.stations = rows.map((row, index) => ({
      id: index + 1,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      code: row.code,
      city: row.city,
    }));

    this.stationByCode = new Map(this.stations.map((station) => [station.code, station]));
  }

  private resolveStationsFilePath(): string {
    const candidates = [
      path.resolve(process.cwd(), 'src', 'database', 'static_data', 'stations.json'),
      path.resolve(process.cwd(), 'apps', 'backend', 'src', 'database', 'static_data', 'stations.json'),
      path.resolve(__dirname, '..', 'database', 'static_data', 'stations.json'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return candidates[0];
  }

  private parseStationRow(
      record: Array<string | number>,
      fieldIndexMap: Map<string, number>
  ): ParsedStationJsonRow | null {
    const codeIdx = fieldIndexMap.get('CODIGO');
    const nameIdx = fieldIndexMap.get('DESCRIPCION');
    const latIdx = fieldIndexMap.get('LATITUD');
    const lngIdx = fieldIndexMap.get('LONGITUD');
    const cityIdx = fieldIndexMap.get('POBLACION');

    if (codeIdx === undefined || nameIdx === undefined || latIdx === undefined || lngIdx === undefined) {
      return null;
    }

    const code = String(record[codeIdx]).trim();
    const name = String(record[nameIdx]).trim();
    const lat = Number(record[latIdx]);
    const lng = Number(record[lngIdx]);
    const city = cityIdx !== undefined ? String(record[cityIdx] || '').trim() : '';

    if (!code || !name || Number.isNaN(lat) || Number.isNaN(lng)) {
      return null;
    }

    return {
      code,
      name,
      lat,
      lng,
      city,
    };
  }
}