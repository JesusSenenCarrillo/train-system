import {Component, inject} from '@angular/core';
import {RailDataStore} from '../../core/store/rail-data.store';

@Component({
  selector: 'app-rail-incident-panel',
  standalone: true,
  template: `
    <section class="panel">
      <h2>Simulación de incidencia</h2>

      <label>Tren</label>
      <select [value]="store.selectedTrainId()" (change)="onTrainChange($event)">
        <option value="">Selecciona un tren</option>
        @for (train of store.trains(); track train.id) {
          <option [value]="train.id">
            {{ train.trainId }}
          </option>
        }
      </select>

      <label>Estación afectada</label>
      <select [value]="store.selectedStationId()" (change)="onStationChange($event)">
        <option value="">Selecciona una estación</option>
        @for (station of store.stations(); track station.id) {
          <option [value]="station.id">
            {{ station.name }}
          </option>
        }
      </select>

      <label>Tipo de incidencia</label>
      <select [value]="store.incidentType()" (change)="onIncidentTypeChange($event)">
        <option value="delay">Retraso</option>
        <option value="failure">Avería</option>
        <option value="track_blocked">Vía bloqueada</option>
      </select>

      <label>Descripción</label>
      <textarea
        [value]="store.description()"
        (input)="onDescriptionInput($event)"
        rows="4"
      ></textarea>

      <button type="button" (click)="createIncident()" [disabled]="!store.canCreateIncident()">
        Crear incidencia
      </button>
    </section>
  `,
})
export class RailIncidentPanelComponent {
  readonly store = inject(RailDataStore);

  /**
   * Handles train selection changes.
   *
   * @param event - The change event from the select element.
   */
  onTrainChange(event: Event): void {
    this.store.setSelectedTrainId(this.readValue(event));
  }

  /**
   * Handles station selection changes.
   *
   * @param event - The change event from the select element.
   */
  onStationChange(event: Event): void {
    this.store.setSelectedStationId(this.readValue(event));
  }

  /**
   * Handles incident type selection changes.
   *
   * @param event - The change event from the select element.
   */
  onIncidentTypeChange(event: Event): void {
    const value = this.readValue(event) as 'delay' | 'failure' | 'track_blocked';
    this.store.setIncidentType(value);
  }

  /**
   * Handles description input changes.
   *
   * @param event - The input event from the textarea element.
   */
  onDescriptionInput(event: Event): void {
    this.store.setDescription(this.readValue(event));
  }

  /** Triggers incident creation through the store. */
  createIncident(): void {
    this.store.createIncident();
  }

  /**
   * Reads the value from a form control event target.
   *
   * @param event - The DOM event.
   * @returns The current value of the target element.
   */
  private readValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }
}
