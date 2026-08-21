import {Component, computed, inject} from '@angular/core';
import {RailDataStore} from '../../core/store/rail-data.store';
import {DatePipe} from "@angular/common";

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

      <div class="stack" style="margin-top: 1rem;">
        <h3>Alertas críticas (impacto operativo)</h3>
        @if (criticalImpactRows().length > 0) {
          <table class="company-table">
            <thead>
            <tr>
              <th>Hora</th>
              <th>Incidencia</th>
              <th>Severidad</th>
              <th>Trenes afectados</th>
              <th>Estaciones afectadas</th>
            </tr>
            </thead>
            <tbody>
              @for (row of criticalImpactRows(); track row.id) {
                <tr>
                  <td>{{ row.startedAt | date: 'short' }}</td>
                  <td>{{ row.incidentType }}</td>
                  <td>{{ row.severity }}</td>
                  <td>{{ row.trains.join(', ') || '—' }}</td>
                  <td>{{ row.stations.join(', ') || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="muted">No hay alertas críticas con impacto inferido.</p>
        }
      </div>
    </section>
  `,
  imports: [
    DatePipe
  ]
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
  /** Critical incidents displayed in a company-like operational table. */
  readonly criticalImpactRows = computed(() => this.store.criticalAlertImpactRows());
}
