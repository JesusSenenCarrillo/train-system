import {CommonModule} from '@angular/common';
import {
    AfterViewInit,
    Component,
    effect,
    EffectRef,
    ElementRef,
    inject,
    Injector,
    OnDestroy,
    ViewChild,
} from '@angular/core';
import * as L from 'leaflet';
import {RailDataStore} from '../../core/store/rail-data.store';

@Component({
    selector: 'app-rail-map',
    standalone: true,
    imports: [CommonModule],
    template: `
        <section class="panel">
            <h2>Mapa en tiempo real</h2>
            <div #mapHost class="map-canvas"></div>
        </section>
    `,
})
export class RailMapComponent implements AfterViewInit, OnDestroy {
    @ViewChild('mapHost', {static: true}) mapHost!: ElementRef<HTMLDivElement>;

    readonly store = inject(RailDataStore);
    readonly injector = inject(Injector);

    private map: any = null;
    private markers: any = null;
    private paths: any = null;
    private renderEffect: EffectRef | null = null;

    ngAfterViewInit(): void {
        this.initializeMap();
        this.renderEffect = effect(() => {
            this.renderMarkers();
            this.renderRoutes();
        }, {injector: this.injector});
    }

    ngOnDestroy(): void {
        this.renderEffect?.destroy();
        this.markers?.remove();
        this.paths?.remove();
        this.map?.remove();
    }

    private initializeMap(): void {
        const iberiaBounds = L.latLngBounds(L.latLng(27.5, -18), L.latLng(52.5, 8));

        this.map = L.map(this.mapHost.nativeElement, {
            maxBounds: iberiaBounds,
            maxBoundsViscosity: 1,
            center: iberiaBounds.getCenter(),
            zoom: 6,
            fullscreenControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            minZoom: 4,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.map);

        this.markers = L.layerGroup().addTo(this.map);
        this.paths = L.layerGroup().addTo(this.map);
    }

    private renderMarkers(): void {
        if (!this.map || !this.markers) {
            return;
        }

        this.markers.clearLayers();

        const stations = this.store.stations();
        const trains = this.store.trains();
        const bounds: Array<[number, number]> = [];

        stations.forEach((station) => {
            const marker = L.circleMarker([station.lat, station.lng], {
                title: station.name,
                radius: 3,
                color: '#870164',
                fillColor: 'white',
                fillOpacity: 1,
            }).bindPopup(`<strong>${station.name}</strong><br>${station.code} · ${station.city}`);

            marker.addTo(this.markers!);
            bounds.push([station.lat, station.lng]);
        });

        trains.forEach((train) => {
            const marker = L.circleMarker([train.latitude, train.longitude], {
                radius: 3,
                color: 'red',
                fillOpacity: 1,
            }).bindPopup(
                `<strong>${train.trainId}</strong><br>${train.serviceType} · ${train.currentStatus}<br>Retraso: ${train.delayMinutes} min`
            );

            marker.addTo(this.markers!);
            bounds.push([train.latitude, train.longitude]);
        });

        if (bounds.length > 0) {
            this.map.fitBounds(bounds, {padding: [20, 20]});
        }
    }

    private renderRoutes(): void {
        const routes = this.store.routes();
        if (routes.length > 0) {
            routes.forEach((route) => {
                const latLngs = route.pathStationIds.map((stationId) => {
                    const station = this.store.stations().find((s) => s.code === stationId);
                    return station ? [station.lat, station.lng] : null;
                }).filter((latLng): latLng is [number, number] => latLng !== null);
                const path = L.polyline(latLngs, {color: 'red', weight: 2, opacity: 0.7});
                path.addTo(this.paths!);
            });
        }
    }
}
