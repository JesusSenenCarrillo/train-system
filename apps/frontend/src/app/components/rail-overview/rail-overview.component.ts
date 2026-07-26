import {Component, computed, inject} from '@angular/core';
import {RailDataStore} from '../../core/store/rail-data.store';

@Component({
  selector: 'app-rail-overview',
  standalone: true,
  template: `
    <section class="panel">
      <h2>Resumen</h2>

      <div class="stats">
        <div class="stat-card">
          <strong>{{ stationCount() }}</strong>
          <p>Estaciones</p>
        </div>
        <div class="stat-card">
          <strong>{{ trainCount() }}</strong>
          <p>Trenes</p>
        </div>
        <div class="stat-card">
          <strong>{{ incidentCount() }}</strong>
          <p>Incidencias</p>
        </div>
        <div class="stat-card">
          <strong>{{ scheduleUpdateCount() }}</strong>
          <p>Actualizaciones</p>
        </div>
      </div>

      <div class="stack" style="margin-top: 1rem;">
        @if (store.loading()) {
          <p class="muted">Cargando datos normalizados...</p>
        }
        @if (store.error(); as error) {
          <p class="error">{{ error }}</p>
        }
        <p class="muted">Última sincronización: {{ syncLabel() }}</p>
      </div>
    </section>
  `,
})
export class RailOverviewComponent {
  readonly store = inject(RailDataStore);

  /** Number of loaded stations. */
  readonly stationCount = computed(() => this.store.stations().length);
  /** Number of loaded trains. */
  readonly trainCount = computed(() => this.store.trains().length);
  /** Number of loaded incidents. */
  readonly incidentCount = computed(() => this.store.incidents().length);
  /** Number of loaded schedule updates. */
  readonly scheduleUpdateCount = computed(() => this.store.scheduleUpdates().length);
  /** Human-readable last sync label. */
  readonly syncLabel = computed(() => this.store.lastSyncAt() ?? 'Pendiente');
}
