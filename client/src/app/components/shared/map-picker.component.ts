import { Component, OnInit, AfterViewInit, OnDestroy, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { ZoneService } from '../../services/zone.service';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="map-picker-wrapper">
      <div class="search-overlay glass-card">
        <i class="ti ti-search search-icon"></i>
        <input type="text" [(ngModel)]="searchQuery" (keyup.enter)="searchAddress()"
               placeholder="Search road or address..." class="search-input" />
        <button class="btn-primary btn-search" (click)="searchAddress()" type="button">Search</button>
      </div>

      <div #mapElement class="picker-map"></div>

      <div class="coords-overlay glass-card">
        <div class="meta-row">
          <i class="ti ti-map-pin-filled pin-icon"></i>
          <span class="address-text">{{ formattedAddress || 'Select a location on the map' }}</span>
        </div>
        <div class="gps-row" *ngIf="coords">
          <span class="gps-coords">Lat: {{ coords.lat.toFixed(5) }}, Lng: {{ coords.lng.toFixed(5) }}</span>
          <button class="btn-ghost btn-sm" (click)="getUserLocation()" type="button">
            <i class="ti ti-current-location"></i> GPS Fill
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-picker-wrapper {
      position: relative;
      width: 100%;
      height: 350px;
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: var(--glass-border);
      box-shadow: var(--glass-shadow);
    }
    .picker-map {
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    .search-overlay {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      z-index: 10;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .search-icon {
      color: var(--color-muted);
      font-size: 16px;
    }
    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
      font-size: 13px;
      color: var(--color-text);
    }
    .btn-search {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 12px;
    }
    .coords-overlay {
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      z-index: 10;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .meta-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .pin-icon {
      color: var(--color-danger);
      font-size: 16px;
      margin-top: 2px;
    }
    .address-text {
      font-size: 12px;
      font-weight: 500;
      color: var(--color-text);
      line-height: 1.3;
    }
    .gps-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 0.5px solid rgba(0, 0, 0, 0.05);
      padding-top: 6px;
      margin-top: 4px;
    }
    .gps-coords {
      font-family: monospace;
      font-size: 11px;
      color: var(--color-muted);
    }
    .btn-sm {
      padding: 4px 10px;
      font-size: 11px;
      border-radius: 10px;
    }
  `]
})
export class MapPickerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() locationPicked = new EventEmitter<{ lat: number; lng: number; address: string; zone: string }>();
  @ViewChild('mapElement') mapElement!: ElementRef;

  private map!: L.Map;
  private marker!: L.Marker;

  searchQuery = '';
  formattedAddress = '';
  coords: { lat: number; lng: number } | null = null;
  zone = 'Zone A';

  constructor(private http: HttpClient, private zoneService: ZoneService) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    // Default location: Vadodara City center [22.3072, 73.1812]
    const defaultCoords = L.latLng(22.3072, 73.1812);
    
    this.map = L.map(this.mapElement.nativeElement, {
      zoomControl: false,
      attributionControl: false
    }).setView(defaultCoords, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(this.map);

    const redIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    this.marker = L.marker(defaultCoords, {
      draggable: true,
      icon: redIcon
    }).addTo(this.map);

    this.coords = { lat: defaultCoords.lat, lng: defaultCoords.lng };
    this.reverseGeocode(defaultCoords.lat, defaultCoords.lng);

    this.marker.on('dragend', () => {
      const position = this.marker.getLatLng();
      this.coords = { lat: position.lat, lng: position.lng };
      this.reverseGeocode(position.lat, position.lng);
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker.setLatLng(e.latlng);
      this.coords = { lat: e.latlng.lat, lng: e.latlng.lng };
      this.reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    // Try to get user location on load
    this.getUserLocation();
  }

  getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const userLatLng = L.latLng(lat, lng);
          
          this.map.setView(userLatLng, 16);
          this.marker.setLatLng(userLatLng);
          this.coords = { lat, lng };
          this.reverseGeocode(lat, lng);
        },
        () => {
          console.warn('Geolocation access denied or unavailable.');
        }
      );
    }
  }

  searchAddress() {
    if (!this.searchQuery) return;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}`;
    this.http.get<any[]>(url).subscribe(res => {
      if (res && res.length > 0) {
        const first = res[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        const latLng = L.latLng(lat, lng);
        
        this.map.setView(latLng, 16);
        this.marker.setLatLng(latLng);
        this.coords = { lat, lng };
        this.formattedAddress = first.display_name;
        this.detectZone(lat, lng);
        this.emitLocation();
      } else {
        alert('Address not found.');
      }
    });
  }

  private reverseGeocode(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res) {
          this.formattedAddress = res.display_name;
          this.detectZone(lat, lng);
        }
      },
      error: () => {
        this.formattedAddress = `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.detectZone(lat, lng);
      }
    });
  }

  private detectZone(lat: number, lng: number) {
    this.zoneService.detectZone(lat, lng).subscribe({
      next: (result) => {
        this.zone = result.zone;
        this.emitLocation();
      },
      error: () => {
        this.zone = 'Zone A'; // Fallback
        this.emitLocation();
      }
    });
  }

  private emitLocation() {
    if (this.coords) {
      this.locationPicked.emit({
        lat: this.coords.lat,
        lng: this.coords.lng,
        address: this.formattedAddress,
        zone: this.zone
      });
    }
  }
}
