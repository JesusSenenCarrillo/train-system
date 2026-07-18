import {Injectable, OnModuleInit} from '@nestjs/common';
import {Station} from '@train-system/shared-types';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import * as path from 'node:path';

interface ParsedStationCsvRow {
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
    await this.loadStationsFromCsv();
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

  private async loadStationsFromCsv(): Promise<void> {
    const stationsPath = this.resolveStationsFilePath();
    const buffer = await readFile(stationsPath);
    const raw = buffer.toString('latin1');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      this.stations = [];
      this.stationByCode.clear();
      return;
    }

    const rows = lines.slice(1).map((line) => this.parseStationRow(line)).filter((row) => row !== null);
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
      path.resolve(process.cwd(), 'src', 'database', 'static_data', 'stations.csv'),
      path.resolve(process.cwd(), 'apps', 'backend', 'src', 'database', 'static_data', 'stations.csv'),
      path.resolve(__dirname, '..', 'database', 'static_data', 'stations.csv'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return candidates[0];
  }

  private parseStationRow(line: string): ParsedStationCsvRow | null {
    const columns = this.parseCsvLine(line, ';');
    if (columns.length < 8) {
      return null;
    }

    const code = columns[0]?.trim();
    const name = columns[1]?.trim();
    const lat = Number(columns[2]);
    const lng = Number(columns[3]);
    const city = columns[6]?.trim();

    if (!code || !name || Number.isNaN(lat) || Number.isNaN(lng)) {
      return null;
    }

    return {
      code,
      name,
      lat,
      lng,
      city: city || '',
    };
  }

  private parseCsvLine(line: string, separator: string): string[] {
    const output: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === separator && !inQuotes) {
        output.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    output.push(current);
    return output;
  }
}
