import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Train, Station, IncidentPayload, ReroutePlan } from '@train-system/shared-types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  stations: Station[] = [];
  trains: Train[] = [];
  incidentType = 'delay';
  selectedTrainId = '';
  selectedStationId = '';
  description = '';
  rerouteResult: ReroutePlan | null = null;
  private map: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.http.get<Station[]>('/api/stations').subscribe((stations) => {
      this.stations = stations;
      this.http.get<Train[]>('/api/trains').subscribe((trains) => {
        this.trains = trains;
        this.initMap();
      });
    });
  }

  initMap() {
    if (this.map) return;
    this.map = L.map('map').setView([40.4168, -3.7038], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.stations.forEach((station) => {
      L.circleMarker([station.lat, station.lng], { radius: 6 })
        .bindPopup(station.name)
        .addTo(this.map!);
    });

    this.trains.forEach((train) => {
      const station = this.stations.find((s) => s.id === train.id);
      if (station) {
        L.marker([station.lat, station.lng]).addTo(this.map!);
      }
    });
  }

  createIncident() {
    const payload: IncidentPayload = {
      trainId: Number(this.selectedTrainId),
      stationId: Number(this.selectedStationId),
      type: this.incidentType,
      description: this.description || 'Simulated incident',
    };

    this.http.post('/api/incidents', payload).subscribe(() => {
      this.http.post<ReroutePlan>('/api/reroute', payload).subscribe((plan) => {
        this.rerouteResult = plan;
      });
    });
  }
}
