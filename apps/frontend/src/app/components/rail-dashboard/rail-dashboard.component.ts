import {Component, inject, OnInit} from '@angular/core';
import {RailDataStore} from '../../core/store/rail-data.store';
import {RailIncidentPanelComponent} from '../rail-incident-panel/rail-incident-panel.component';
import {RailMapComponent} from '../rail-map/rail-map.component';
import {RailOverviewComponent} from '../rail-overview/rail-overview.component';
import {RailReroutePanelComponent} from '../rail-reroute-panel/rail-reroute-panel.component';

@Component({
  selector: 'app-rail-dashboard',
  standalone: true,
  imports: [
    RailOverviewComponent,
    RailMapComponent,
    RailIncidentPanelComponent,
    RailReroutePanelComponent,
  ],
  template: `
    <main class="dashboard-shell">
      <section class="panel hero">
        <div class="stack">
          <h1>Sistema de replanificación ferroviaria</h1>
          <p class="muted">
            Vista unificada de trenes, incidencias y rutas alternativas normalizadas desde RENFE.
          </p>
          @if (store.lastSyncAt(); as lastSyncAt) {
            <p class="muted">Última sincronización: {{ lastSyncAt }}</p>
          }
        </div>

        <button type="button" (click)="refresh()" [disabled]="store.loading()">Actualizar datos</button>
      </section>

      <section class="dashboard-grid">
        <app-rail-overview></app-rail-overview>
        <app-rail-map></app-rail-map>
        <app-rail-incident-panel></app-rail-incident-panel>
        <app-rail-reroute-panel></app-rail-reroute-panel>
      </section>
    </main>
  `,
})
export class RailDashboardComponent implements OnInit {
  readonly store = inject(RailDataStore);

  ngOnInit(): void {
    this.store.loadSnapshot();
  }

  refresh(): void {
    this.store.refresh();
  }
}
