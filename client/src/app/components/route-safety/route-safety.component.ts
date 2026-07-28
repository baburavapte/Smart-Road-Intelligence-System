import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { CircularRingComponent } from '../shared/circular-ring.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-route-safety',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CircularRingComponent, StatusBadgeComponent],
  template: `
    <div class="page-container flex-page">
      <div class="container">
        
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">Route Safety Inspector</h1>
            <p class="page-header-subtitle">Evaluate road surface quality, pothole concentrations, and safe routing alternative paths.</p>
          </div>
        </header>

        <div class="route-safety-layout animate-fade-in-up">
          
          <!-- Left: Apple-style Planner Sidebar -->
          <aside class="planner-sidebar flex-col">
            
            <!-- Address Inputs -->
            <div class="glass-card planner-inputs-card flex-col">
              <h3 class="card-title">Plan Safe Route</h3>
              
              <div class="form-group">
                <label class="card-label">Start Point Address</label>
                <div class="input-row">
                  <input type="text" [(ngModel)]="startQuery" placeholder="e.g. Alkapuri, Vadodara" class="glass-input" />
                  <button class="btn-secondary btn-icon-sm" (click)="geocodeStart()" title="Search location"><i class="ti ti-search"></i></button>
                </div>
                <span class="coords-subtitle" *ngIf="startCoords">Geocoded: {{ startCoords[0].toFixed(5) }}, {{ startCoords[1].toFixed(5) }}</span>
              </div>

              <div class="form-group">
                <label class="card-label">Destination Address</label>
                <div class="input-row">
                  <input type="text" [(ngModel)]="endQuery" placeholder="e.g. Gotri Road, Vadodara" class="glass-input" />
                  <button class="btn-secondary btn-icon-sm" (click)="geocodeEnd()" title="Search location"><i class="ti ti-search"></i></button>
                </div>
                <span class="coords-subtitle" *ngIf="endCoords">Geocoded: {{ endCoords[0].toFixed(5) }}, {{ endCoords[1].toFixed(5) }}</span>
              </div>

              <button class="btn-primary w-full" [disabled]="!startCoords || !endCoords || loading" (click)="inspectRoute()">
                {{ loading ? 'Analyzing route safety...' : 'Inspect Route Safety' }}
              </button>
            </div>

            <!-- SVG Safety circular indicator -->
            <div class="glass-card circular-score-panel text-center" *ngIf="routesList.length > 0">
              <app-circular-ring [score]="routesList[selectedRouteIndex].safetyPercentage" unit="Safety index"></app-circular-ring>
              <div class="route-summary-stats" style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div class="stat-mini">
                  <span class="card-label">Risk Rating</span>
                  <span class="bold-td text-danger" style="font-size: 15px;">{{ routesList[selectedRouteIndex].avgSeverityLabel | uppercase }}</span>
                </div>
                <div class="stat-mini">
                  <span class="card-label">Distress Count</span>
                  <span class="bold-td" style="font-size: 15px;">{{ routesList[selectedRouteIndex].totalPotholes }} active</span>
                </div>
              </div>
            </div>

            <!-- Alternative Routes List selector -->
            <div class="glass-card alternatives-card flex-col" *ngIf="routesList.length > 0">
              <h3 class="card-title">Alternative Routes</h3>
              <div class="routes-list">
                <div class="route-card-item" 
                     *ngFor="let r of routesList; let idx = index" 
                     [class.active]="selectedRouteIndex === idx"
                     (click)="selectRoute(idx)">
                  <div class="route-left">
                    <h4>Alternative path #{{ idx + 1 }}</h4>
                    <span class="route-meta">{{ (r.distance/1000) | number:'1.1-1' }} km · {{ Math.round(r.duration/60) }} mins</span>
                  </div>
                  <span class="route-safety-badge" 
                        [style.background]="r.safetyPercentage > 80 ? 'rgba(48,209,88,0.12)' : (r.safetyPercentage >= 50 ? 'rgba(255,214,10,0.15)' : 'rgba(255,69,58,0.12)')"
                        [style.color]="r.safetyPercentage > 80 ? 'var(--color-success)' : (r.safetyPercentage >= 50 ? 'var(--color-warning)' : 'var(--color-danger)')">
                    {{ r.safetyPercentage }}%
                  </span>
                </div>
              </div>
            </div>

          </aside>

          <!-- Right: Leaflet Map Viewer (55%) -->
          <main class="map-view-panel glass-card">
            <div class="map-container-wrapper">
              <div #mapContainer class="leaflet-route-map"></div>
              
              <!-- Floating Legend -->
              <div class="map-legend glass-card">
                <span class="legend-item"><span class="legend-color safe"></span> Safe (0 distress)</span>
                <span class="legend-item"><span class="legend-color warning"></span> Moderate (< 2 distress)</span>
                <span class="legend-item"><span class="legend-color danger"></span> Critical (Active distress)</span>
              </div>
            </div>
          </main>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .flex-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-bottom: 80px;
    }

    .w-full {
      width: 100%;
    }

    .route-safety-layout {
      display: grid;
      grid-template-columns: 1fr 1.6fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 900px) {
      .route-safety-layout {
        grid-template-columns: 1fr;
      }
    }

    .planner-sidebar {
      gap: 16px;
    }

    .planner-inputs-card, .circular-score-panel, .alternatives-card {
      padding: 20px;
    }

    .input-row {
      display: flex;
      gap: 8px;
    }

    .btn-icon-sm {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      flex-shrink: 0;
    }

    .coords-subtitle {
      font-size: 10px;
      color: var(--color-primary);
      margin-top: 4px;
      display: block;
      font-weight: 500;
    }

    .route-summary-stats {
      border-top: 0.5px solid rgba(0,0,0,0.05);
      padding-top: 12px;
    }

    .stat-mini {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .routes-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .route-card-item {
      padding: 10px;
      background: rgba(0,0,0,0.015);
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      transition: var(--transition);
      border: 0.5px solid rgba(0,0,0,0.03);
    }

    .route-card-item:hover {
      background: rgba(0,0,0,0.03);
    }

    .route-card-item.active {
      background: rgba(0, 122, 255, 0.05);
      border-color: var(--color-primary);
    }

    .route-left h4 {
      font-size: 12px;
      font-weight: 700;
      margin: 0;
    }

    .route-meta {
      font-size: 10px;
      color: var(--color-muted);
    }

    .route-safety-badge {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .map-view-panel {
      height: 540px;
      overflow: hidden;
      padding: 0;
    }

    .map-container-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .leaflet-route-map {
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .map-legend {
      position: absolute;
      bottom: 20px;
      left: 20px;
      z-index: 10;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: rgba(255, 255, 255, 0.9);
    }

    .legend-item {
      font-size: 11px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-color {
      width: 12px;
      height: 6px;
      border-radius: 3px;
      display: inline-block;
    }
    
    .legend-color.safe { background: var(--color-success); }
    .legend-color.warning { background: var(--color-warning); }
    .legend-color.danger { background: var(--color-danger); }
  `]
})
export class RouteSafetyComponent implements OnInit, OnDestroy {
  startQuery = 'Alkapuri, Vadodara';
  endQuery = 'Gotri Road, Vadodara';
  
  startCoords: number[] | null = null; // [lng, lat]
  endCoords: number[] | null = null; // [lng, lat]
  
  loading = false;
  routesList: any[] = [];
  selectedRouteIndex = 0;
  Math = Math;

  private map!: L.Map;
  private routeLineGroup = L.layerGroup();
  private markersGroup = L.layerGroup();

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  constructor(private apiService: ApiService, private http: HttpClient) {}

  ngOnInit() {
    // Geocode defaults on load
    this.geocodeStart();
    this.geocodeEnd();
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }

  private initMap() {
    const center = L.latLng(22.3072, 73.1812);
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false,
      attributionControl: false
    }).setView(center, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(this.map);

    this.routeLineGroup.addTo(this.map);
    this.markersGroup.addTo(this.map);
  }

  geocodeStart() {
    if (!this.startQuery) return;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.startQuery + ', Vadodara')}`;
    this.http.get<any[]>(url).subscribe(res => {
      if (res && res.length > 0) {
        const first = res[0];
        this.startCoords = [parseFloat(first.lon), parseFloat(first.lat)];
      }
    });
  }

  geocodeEnd() {
    if (!this.endQuery) return;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.endQuery + ', Vadodara')}`;
    this.http.get<any[]>(url).subscribe(res => {
      if (res && res.length > 0) {
        const first = res[0];
        this.endCoords = [parseFloat(first.lon), parseFloat(first.lat)];
      }
    });
  }

  inspectRoute() {
    if (!this.startCoords || !this.endCoords) return;

    this.loading = true;
    this.apiService.planRoute(this.startCoords!, this.endCoords!).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.routes && res.routes.length > 0) {
          this.routesList = res.routes;
          this.selectRoute(0);
        } else {
          alert('Failed to calculate safe routes.');
        }
      },
      error: () => {
        this.loading = false;
        alert('Route navigation service unavailable.');
      }
    });
  }

  selectRoute(idx: number) {
    this.selectedRouteIndex = idx;
    const route = this.routesList[idx];

    // Clear previous layers
    this.routeLineGroup.clearLayers();
    this.markersGroup.clearLayers();

    // Draw route segments color coded
    const coordinates = route.coordinates.map((c: number[]) => L.latLng(c[1], c[0])); // OSRM is [lng, lat]
    
    // Draw the whole route as a line. In a high-quality visualization, we can draw a buffer line or segment-based warnings
    const color = route.safetyPercentage > 85 ? 'var(--color-success)' : (route.safetyPercentage >= 50 ? 'var(--color-warning)' : 'var(--color-danger)');
    
    const polyline = L.polyline(coordinates, {
      color: color,
      weight: 5,
      opacity: 0.8
    });
    this.routeLineGroup.addLayer(polyline);

    // Draw 100m buffer circles around route warning potholes
    route.potholes.forEach((p: any) => {
      const pCoords = p.location.coordinates;
      const latLng = L.latLng(pCoords[1], pCoords[0]);
      
      const bufferCircle = L.circle(latLng, {
        radius: 100, // 100m buffer zone
        color: 'var(--color-danger)',
        fillColor: 'var(--color-danger)',
        fillOpacity: 0.15,
        weight: 1
      });
      this.markersGroup.addLayer(bufferCircle);

      const marker = L.marker(latLng);
      marker.bindPopup(`<strong>Active distress spot within 100m of route path</strong>`);
      this.markersGroup.addLayer(marker);
    });

    // Zoom map to fit route bounds
    const bounds = L.latLngBounds(coordinates);
    this.map.fitBounds(bounds, { padding: [40, 40] });
  }
}
