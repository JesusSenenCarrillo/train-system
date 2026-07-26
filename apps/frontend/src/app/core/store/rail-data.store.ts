import {computed, inject, Injectable, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {forkJoin} from 'rxjs';
import {
    Incident,
    IncidentPayload,
    ReroutePlan,
    Route,
    ScheduleUpdate,
    Station,
    Train,
} from '@train-system/shared-types';

@Injectable({ providedIn: 'root' })
export class RailDataStore {
  private readonly http = inject(HttpClient);

  private readonly stationsState = signal<Station[]>([]);
  private readonly trainsState = signal<Train[]>([]);
  private readonly routesState = signal<Route[]>([]);
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
  readonly routes = computed(() => this.routesState());
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

  /** Computed signal that resolves the currently selected train, if any. */
  readonly selectedTrain = computed(() => {
    const selectedId = this.selectedTrainIdState();
    return this.trainsState().find((train) => String(train.id) === selectedId) ?? null;
  });

  /** Computed signal that resolves the currently selected station, if any. */
  readonly selectedStation = computed(() => {
    const selectedId = this.selectedStationIdState();
    return this.stationsState().find((station) => String(station.id) === selectedId) ?? null;
  });

  /** Computed signal that returns the most recently loaded incident. */
  readonly latestIncident = computed(() => this.incidentsState()[0] ?? null);

  /** Computed signal that is true when a train or station has been selected. */
  readonly canCreateIncident = computed(() => {
    return Boolean(this.selectedTrainIdState() || this.selectedStationIdState());
  });

  /**
   * Loads the full dashboard snapshot from the backend in parallel.
   *
   * Updates all state signals and records the sync timestamp on success.
   */
  loadSnapshot(): void {
    this.loadingState.set(true);
    this.errorState.set(null);

    forkJoin({
      stations: this.http.get<Station[]>('/api/stations'),
      trains: this.http.get<Train[]>('/api/trains'),
      routes: this.http.get<Route[]>('/api/routes'),
      incidents: this.http.get<Incident[]>('/api/incidents'),
      scheduleUpdates: this.http.get<ScheduleUpdate[]>('/api/trains/schedules'),
    }).subscribe({
      next: ({ stations, trains, routes, incidents, scheduleUpdates }) => {
        this.stationsState.set(stations);
        this.trainsState.set(trains);
        this.routesState.set(routes);
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

  /** Refreshes the dashboard snapshot. */
  refresh(): void {
    this.loadSnapshot();
  }

  /**
   * Sets the id of the selected train.
   *
   * @param value - The train id.
   */
  setSelectedTrainId(value: string): void {
    this.selectedTrainIdState.set(value);
  }

  /**
   * Sets the id of the selected station.
   *
   * @param value - The station id.
   */
  setSelectedStationId(value: string): void {
    this.selectedStationIdState.set(value);
  }

  /**
   * Sets the type of incident to create.
   *
   * @param value - The incident type.
   */
  setIncidentType(value: 'delay' | 'failure' | 'track_blocked'): void {
    this.incidentTypeState.set(value);
  }

  /**
   * Sets the free-text description of the incident to create.
   *
   * @param value - The description.
   */
  setDescription(value: string): void {
    this.descriptionState.set(value);
  }

  /**
   * Creates an incident on the backend and then requests a reroute plan for it.
   *
   * Updates the local incident list and reroute plan state on success.
   */
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
