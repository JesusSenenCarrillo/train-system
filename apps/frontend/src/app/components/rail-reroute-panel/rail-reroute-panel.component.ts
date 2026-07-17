import {Component, inject} from '@angular/core';
import {RailDataStore} from '../../core/store/rail-data.store';

@Component({
  selector: 'app-rail-reroute-panel',
  standalone: true,
  template: `
    <section class="panel">
      <h2>Reroute</h2>

      @if (store.reroutePlan(); as reroutePlan) {
        <div class="card stack">
          <strong>Plan #{{ reroutePlan.id }}</strong>
          <p>Pasajeros afectados: {{ reroutePlan.affectedPassengers }}</p>
          <ul>
            @for (route of reroutePlan.suggestedRoutes; track route) {
              <li>{{ route }}</li>
            }
          </ul>
        </div>
      } @else {
        <p class="muted">Crea una incidencia para generar una propuesta de reroute.</p>
      }

      <div class="stack" style="margin-top: 1rem;">
        <h3>Última incidencia</h3>
        @if (store.latestIncident(); as latestIncident) {
          <p>{{ latestIncident.description }}</p>
        } @else {
          <p class="muted">Todavía no hay incidencias cargadas.</p>
        }
      </div>
    </section>
  `,
})
export class RailReroutePanelComponent {
  readonly store = inject(RailDataStore);
}
