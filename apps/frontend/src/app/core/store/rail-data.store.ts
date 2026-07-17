import {computed, inject, Injectable, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {forkJoin} from 'rxjs';
import {Incident, IncidentPayload, ReroutePlan, ScheduleUpdate, Station, Train,} from '@train-system/shared-types';

@Injectable({ providedIn: 'root' })
export class RailDataStore {
  private readonly http = inject(HttpClient);

  private readonly stationsState = signal<Station[]>([]);
  private readonly trainsState = signal<Train[]>([]);
  private readonly incidentsState = signal<Incident[]>([]);
  private readonly scheduleUpdatesState = signal<ScheduleUpdate[]>([]);
  private readonly reroutePlanState = signal<ReroutePlan | null>(null);
  private readonly selectedTrainIdState = signal('');
  private readonly selectedStationIdState = signal('');
  private readonly incidentTypeState = signal<'delay' | 'failure' | 'track_blocked'>('delay');
  private readonly descriptionState = signal('');
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly lastSyncAtState = signal<string | null>(null);

  readonly stations = computed(() => this.stationsState());
  readonly trains = computed(() => this.trainsState());
  readonly incidents = computed(() => this.incidentsState());
  readonly scheduleUpdates = computed(() => this.scheduleUpdatesState());
  readonly reroutePlan = computed(() => this.reroutePlanState());
  readonly selectedTrainId = computed(() => this.selectedTrainIdState());
  readonly selectedStationId = computed(() => this.selectedStationIdState());
  readonly incidentType = computed(() => this.incidentTypeState());
  readonly description = computed(() => this.descriptionState());
  readonly loading = computed(() => this.loadingState());
  readonly error = computed(() => this.errorState());
  readonly lastSyncAt = computed(() => this.lastSyncAtState());

  readonly selectedTrain = computed(() => {
    const selectedId = this.selectedTrainIdState();
    return this.trainsState().find((train) => String(train.id) === selectedId) ?? null;
  });

  readonly selectedStation = computed(() => {
    const selectedId = this.selectedStationIdState();
    return this.stationsState().find((station) => String(station.id) === selectedId) ?? null;
  });

  readonly latestIncident = computed(() => this.incidentsState()[0] ?? null);

  readonly canCreateIncident = computed(() => {
    return Boolean(this.selectedTrainIdState() || this.selectedStationIdState());
  });

  loadSnapshot(): void {
    this.loadingState.set(true);
    this.errorState.set(null);

    forkJoin({
      stations: this.http.get<Station[]>('/api/stations'),
      trains: this.http.get<Train[]>('/api/trains'),
      incidents: this.http.get<Incident[]>('/api/incidents'),
      scheduleUpdates: this.http.get<ScheduleUpdate[]>('/api/trains/schedules'),
    }).subscribe({
      next: ({ stations, trains, incidents, scheduleUpdates }) => {
        this.stationsState.set(stations);
        this.trainsState.set(trains);
        this.incidentsState.set(incidents);
        this.scheduleUpdatesState.set(scheduleUpdates);
        this.lastSyncAtState.set(new Date().toISOString());
        this.loadingState.set(false);
      },
      error: () => {
        this.errorState.set('No se han podido cargar los datos normalizados del backend.');
        this.loadingState.set(false);
      },
    });
  }

  refresh(): void {
    this.loadSnapshot();
  }

  setSelectedTrainId(value: string): void {
    this.selectedTrainIdState.set(value);
  }

  setSelectedStationId(value: string): void {
    this.selectedStationIdState.set(value);
  }

  setIncidentType(value: 'delay' | 'failure' | 'track_blocked'): void {
    this.incidentTypeState.set(value);
  }

  setDescription(value: string): void {
    this.descriptionState.set(value);
  }

  createIncident(): void {
    const payload: IncidentPayload = {
      trainId: this.selectedTrainIdState() ? Number(this.selectedTrainIdState()) : null,
      stationId: this.selectedStationIdState() ? Number(this.selectedStationIdState()) : null,
      type: this.incidentTypeState(),
      description: this.descriptionState() || 'Simulated incident',
    };

    this.http.post<Incident>('/api/incidents', payload).subscribe({
      next: (incident) => {
        this.incidentsState.update((current) => [incident, ...current]);
        this.http.post<ReroutePlan>('/api/reroute', payload).subscribe({
          next: (plan) => {
            this.reroutePlanState.set(plan);
          },
          error: () => {
            this.errorState.set('Se creó la incidencia, pero no se pudo generar el reroute.');
          },
        });
      },
      error: () => {
        this.errorState.set('No se pudo crear la incidencia.');
      },
    });
  }
}
