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

  /**
   * Loads the static station catalog when the module initializes.
   */
  async onModuleInit(): Promise<void> {
    await this.loadStationsFromJson();
  }

  /**
   * Returns all loaded stations.
   *
   * @returns The full list of stations.
   */
  findAll(): Station[] {
    return this.stations;
  }

  /**
   * Finds a station by its canonical code.
   *
   * @param code - The station code.
   * @returns The matching station, or `undefined` if not found.
   */
  findByCode(code: string): Station | undefined {
    return this.stationByCode.get(code);
  }

  /**
   * Checks whether a station code is known.
   *
   * @param code - The station code.
   * @returns `true` if the code exists in the catalog.
   */
  hasCode(code: string): boolean {
    return this.stationByCode.has(code);
  }

  /**
   * Reads and parses the static stations JSON file into memory.
   */
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

  /**
   * Resolves the path to the static stations JSON file, checking common locations.
   *
   * @returns The first existing candidate path, defaulting to the first candidate.
   */
  private resolveStationsFilePath(): string {
    const candidates = [
      path.resolve(process.cwd(), 'src', 'database', 'static-data', 'stations.json'),
      path.resolve(process.cwd(), 'apps', 'backend', 'src', 'database', 'static-data', 'stations.json'),
      path.resolve(__dirname, '..', 'database', 'static-data', 'stations.json'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return candidates[0];
  }

  /**
   * Parses a single raw station record using the field index map.
   *
   * @param record - The raw record array from the JSON file.
   * @param fieldIndexMap - Map from field name to record index.
   * @returns The parsed row, or `null` if required fields are missing or invalid.
   */
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