import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import * as L from 'leaflet';

interface RouteResult {
    coordinates: number[][];
    distance: number;
    duration: number;
    potholes: any[];
    totalPotholes: number;
    safetyPercentage: number;
    riskScore: number;
    avgSeverity: number;
    avgSeverityLabel: string;
}

@Component({
    selector: 'app-route-safety',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="map-page">
      <!-- Header Bar -->
      <header class="map-header animate-fade-in">
        <div class="header-left">
          <h1 class="page-title-mini">Route Safety</h1>
          <p class="header-sub">Analyze road surface safety between start and destination waypoints</p>
        </div>
        <div class="header-actions">
          <a routerLink="/dashboard" class="btn-secondary">
            <i class="ti ti-map-2" aria-hidden="true"></i> Back to Map
          </a>
        </div>
      </header>

      <!-- Map Container with floating control overlays -->
      <div class="map-body">
        <div #mapContainer id="route-safety-map" class="leaflet-fullmap"></div>

        <!-- Left Control Panel (Apple Maps planner style) -->
        <main class="control-panel glass-card animate-fade-in-up">
          <div class="panel-title">
            <i class="ti ti-location" aria-hidden="true"></i>
            <span>Route Safety Planner</span>
          </div>

          <!-- Start Point -->
          <div class="point-section">
            <label class="point-label">
              <span class="point-dot start-dot" aria-hidden="true"></span>
              Start Point Location
            </label>
            <button
              type="button"
              class="btn-set-point"
              [class.active]="clickMode === 'start'"
              (click)="setClickMode('start')"
            >
              <i class="ti ti-pin" aria-hidden="true"></i>
              {{ clickMode === 'start' ? 'Click on map...' : 'Set Start Point' }}
            </button>
            <div class="coord-display">
              <span *ngIf="startLat !== null">{{ startLat!.toFixed(6) }}, {{ startLng!.toFixed(6) }}</span>
              <span *ngIf="startLat === null" class="coord-placeholder">Click map to drop pin</span>
            </div>
          </div>

          <!-- Destination Point -->
          <div class="point-section">
            <label class="point-label">
              <span class="point-dot end-dot" aria-hidden="true"></span>
              Destination Address
            </label>
            <button
              type="button"
              class="btn-set-point"
              [class.active]="clickMode === 'end'"
              (click)="setClickMode('end')"
            >
              <i class="ti ti-map-pin" aria-hidden="true"></i>
              {{ clickMode === 'end' ? 'Click on map...' : 'Set Destination' }}
            </button>
            <div class="coord-display">
              <span *ngIf="endLat !== null">{{ endLat!.toFixed(6) }}, {{ endLng!.toFixed(6) }}</span>
              <span *ngIf="endLat === null" class="coord-placeholder">Click map to drop pin</span>
            </div>
          </div>

          <div class="panel-divider" aria-hidden="true"></div>

          <!-- Action Buttons -->
          <button
            class="btn-primary btn-find-route"
            [disabled]="startLat === null || endLat === null || loading"
            (click)="findRoute()"
          >
            <span *ngIf="!loading" class="btn-inner-row">
              <i class="ti ti-navigation" aria-hidden="true"></i> Calculate Safety
            </span>
            <span *ngIf="loading" class="btn-spinner"></span>
            <span *ngIf="loading">Analyzing OSRM...</span>
          </button>
          
          <button
            class="btn-secondary btn-clear"
            (click)="clearAll()"
            [disabled]="loading"
          >
            <i class="ti ti-trash" aria-hidden="true"></i> Clear Planner
          </button>

          <!-- Error Message box -->
          <div class="panel-error animate-scale-in" *ngIf="error">
            <i class="ti ti-alert-circle" aria-hidden="true"></i>
            <span>{{ error }}</span>
          </div>
        </main>

        <!-- Right Results Panel (Shown when route calculated) -->
        <aside class="results-panel glass-card animate-fade-in-up" *ngIf="primaryRoute">
          <div class="panel-title">
            <i class="ti ti-activity" aria-hidden="true"></i>
            <span>Safety Analysis</span>
          </div>

          <!-- Safety Score circular ring metric style -->
          <div class="safety-score-card">
            <div class="safety-percentage" [style.color]="getSafetyColor(primaryRoute.safetyPercentage)">
              {{ primaryRoute.safetyPercentage }}%
            </div>
            <div class="safety-label">Route Safety Rating</div>
            <div class="safety-bar">
              <div
                class="safety-bar-fill"
                [style.width.%]="primaryRoute.safetyPercentage"
                [style.background]="getSafetyGradient(primaryRoute.safetyPercentage)"
              ></div>
            </div>
          </div>

          <!-- Details Grid -->
          <div class="results-grid">
            <div class="result-item">
              <span class="result-value" style="color: var(--danger);">{{ primaryRoute.totalPotholes }}</span>
              <span class="result-label">Potholes</span>
            </div>
            <div class="result-item">
              <span class="result-value" [style.color]="getSeverityColor(primaryRoute.avgSeverityLabel)">
                {{ primaryRoute.avgSeverityLabel | titlecase }}
              </span>
              <span class="result-label">Avg Severity</span>
            </div>
            <div class="result-item">
              <span class="result-value" style="color: var(--primary);">{{ formatDistance(primaryRoute.distance) }}</span>
              <span class="result-label">Distance</span>
            </div>
            <div class="result-item">
              <span class="result-value" style="color: var(--text-primary);">{{ formatDuration(primaryRoute.duration) }}</span>
              <span class="result-label">Duration</span>
            </div>
          </div>

          <!-- Pothole Severity Breakdown -->
          <div class="breakdown-section" *ngIf="primaryRoute.potholes.length > 0">
            <div class="breakdown-title">Severity Breakdown</div>
            <div class="breakdown-list">
              <div class="breakdown-row" *ngFor="let item of getPotholeSeverityBreakdown(primaryRoute.potholes)">
                <span class="breakdown-dot" [style.background]="getSeverityColor(item.severity)"></span>
                <span class="breakdown-name">{{ item.severity | titlecase }} Potholes</span>
                <span class="breakdown-count font-outfit">{{ item.count }}</span>
              </div>
            </div>
          </div>

          <!-- Alternative Route comparison panel -->
          <div class="alt-route-card glass-card" *ngIf="alternativeRoute">
            <div class="alt-header">
              <i class="ti ti-arrows-shuffle" aria-hidden="true"></i>
              <span>Alternative Safety Route</span>
            </div>
            <div class="alt-stats">
              <div class="alt-stat">
                <span class="alt-stat-val" [style.color]="getSafetyColor(alternativeRoute.safetyPercentage)">{{ alternativeRoute.safetyPercentage }}%</span>
                <span class="alt-stat-lbl">Safety</span>
              </div>
              <div class="alt-stat">
                <span class="alt-stat-val">{{ alternativeRoute.totalPotholes }}</span>
                <span class="alt-stat-lbl">Potholes</span>
              </div>
              <div class="alt-stat">
                <span class="alt-stat-val">{{ formatDistance(alternativeRoute.distance) }}</span>
                <span class="alt-stat-lbl">Distance</span>
              </div>
              <div class="alt-stat">
                <span class="alt-stat-val">{{ formatDuration(alternativeRoute.duration) }}</span>
                <span class="alt-stat-lbl">Duration</span>
              </div>
            </div>
            <button class="btn-secondary btn-sm btn-use-alt" (click)="useAlternativeRoute()">
              <i class="ti ti-replace" aria-hidden="true"></i> Use This Route
            </button>
          </div>
        </aside>

        <!-- Loading Overlay spinner -->
        <div class="map-loading-overlay glass-card" *ngIf="loading">
          <span class="spinner" aria-hidden="true"></span>
          <p>Analyzing route safety vectors...</p>
        </div>
      </div>
    </div>
  `,
    styles: [`
      .map-page {
        display: flex;
        flex-direction: column;
        height: 100vh;
        position: relative;
        z-index: 1;
      }

      /* Header bar */
      .map-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 32px;
        background: rgba(255, 255, 255, 0.72);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 0.5px solid rgba(0, 0, 0, 0.07);
        z-index: 10;
      }

      .page-title-mini {
        font-family: 'Outfit', sans-serif;
        font-size: 20px;
        font-weight: 600;
        letter-spacing: -0.4px;
        color: var(--text-primary);
        margin: 0;
      }

      .header-sub {
        color: var(--text-secondary);
        font-size: 12.5px;
        margin-top: 1px;
      }

      /* Map Body */
      .map-body {
        flex: 1;
        position: relative;
        overflow: hidden;
      }

      .leaflet-fullmap {
        width: 100%;
        height: 100%;
        z-index: 1;
      }

      /* Left Control Panel */
      .control-panel {
        position: absolute;
        left: 20px;
        top: 20px;
        z-index: 1000;
        width: 320px;
        padding: 24px;
        max-height: calc(100% - 40px);
        overflow-y: auto;
      }

      .panel-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        font-size: 15px;
        color: var(--text-primary);
        margin-bottom: 16px;
      }

      .panel-title i {
        color: var(--primary);
        font-size: 18px;
      }

      .point-section {
        margin-bottom: 14px;
      }

      .point-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10.5px;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 6px;
      }

      .point-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      }

      .start-dot { background: var(--success); }
      .end-dot { background: var(--danger); }

      .btn-set-point {
        width: 100%;
        padding: 8px 12px;
        background: rgba(0,0,0,0.02);
        border: 0.5px solid rgba(0,0,0,0.1);
        border-radius: 12px;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: var(--transition);
      }

      .btn-set-point:hover {
        background: rgba(0,0,0,0.04);
        border-color: rgba(0,0,0,0.15);
      }

      .btn-set-point.active {
        background: rgba(0, 122, 255, 0.06);
        border-color: var(--primary);
        color: var(--primary);
        box-shadow: 0 0 10px rgba(0, 122, 255, 0.15);
      }

      .coord-display {
        margin-top: 6px;
        padding: 6px 12px;
        background: rgba(0, 0, 0, 0.02);
        border-radius: 10px;
        font-family: monospace;
        font-size: 11.5px;
        color: var(--text-primary);
      }

      .coord-placeholder {
        color: var(--text-secondary);
        font-style: italic;
        font-family: inherit;
      }

      .panel-divider {
        height: 0.5px;
        background: rgba(0,0,0,0.08);
        margin: 14px 0;
      }

      .btn-find-route {
        width: 100%;
        padding: 10px 18px;
        font-size: 13.5px;
        font-weight: 600;
        margin-bottom: 8px;
        border-radius: 20px;
      }

      .btn-inner-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-clear {
        width: 100%;
        border-radius: 20px;
      }

      .btn-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        display: inline-block;
      }

      .panel-error {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        padding: 8px 12px;
        background: rgba(255, 69, 58, 0.06);
        border: 0.5px solid rgba(255, 69, 58, 0.2);
        border-radius: 12px;
        font-size: 11.5px;
        color: #d70015;
        line-height: 1.4;
      }
      .panel-error i {
        font-size: 14px;
        flex-shrink: 0;
      }

      /* Right Results Panel */
      .results-panel {
        position: absolute;
        right: 20px;
        top: 20px;
        z-index: 1000;
        width: 300px;
        padding: 24px;
        max-height: calc(100% - 40px);
        overflow-y: auto;
      }

      .safety-score-card {
        text-align: center;
        padding: 16px;
        background: rgba(0, 0, 0, 0.02);
        border: 0.5px solid rgba(0, 0, 0, 0.05);
        border-radius: 16px;
        margin-bottom: 16px;
      }

      .safety-percentage {
        font-family: 'Outfit', sans-serif;
        font-size: 40px;
        font-weight: 700;
        line-height: 1;
        margin-bottom: 2px;
      }

      .safety-label {
        font-size: 11px;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        margin-bottom: 10px;
      }

      .safety-bar {
        height: 5px;
        background: rgba(0,0,0,0.05);
        border-radius: 3px;
        overflow: hidden;
      }

      .safety-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.8s ease-out;
      }

      .results-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 16px;
      }

      .result-item {
        display: flex;
        flex-direction: column;
        padding: 10px;
        background: rgba(0,0,0,0.02);
        border: 0.5px solid rgba(0,0,0,0.04);
        border-radius: 10px;
      }

      .result-value {
        font-family: 'Outfit', sans-serif;
        font-size: 16px;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1.2;
      }

      .result-label {
        font-size: 9.5px;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.4px;
        font-weight: 600;
      }

      .breakdown-section {
        margin-bottom: 16px;
      }

      .breakdown-title {
        font-size: 10.5px;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 6px;
      }

      .breakdown-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .breakdown-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 10px;
        background: rgba(0,0,0,0.02);
        border-radius: 10px;
        font-size: 12.5px;
      }

      .breakdown-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .breakdown-name {
        flex: 1;
        color: var(--text-secondary);
      }

      .breakdown-count {
        font-weight: 600;
        color: var(--text-primary);
      }

      .alt-route-card {
        padding: 14px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.02) !important;
      }

      .alt-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 10px;
      }

      .alt-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        margin-bottom: 12px;
      }

      .alt-stat {
        display: flex;
        flex-direction: column;
        text-align: center;
      }

      .alt-stat-val {
        font-family: 'Outfit', sans-serif;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .alt-stat-lbl {
        font-size: 8.5px;
        color: var(--text-secondary);
        text-transform: uppercase;
        margin-top: 1px;
      }

      .btn-use-alt {
        width: 100%;
        font-size: 11.5px;
        border-radius: 14px;
        padding: 5px 10px;
      }

      /* Loader overlays */
      .map-loading-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 1001;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(5px);
        margin: 0;
      }

      .map-loading-overlay p {
        font-size: 13.5px;
        color: var(--text-secondary);
        margin-top: 10px;
      }

      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(0, 0, 0, 0.05);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `]
})
export class RouteSafetyComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('mapContainer') mapContainer!: ElementRef;

    private map: L.Map | null = null;
    private routingLayer: L.LayerGroup | null = null;
    private markersLayer: L.LayerGroup | null = null;
    
    // Safety pins
    startLat: number | null = null;
    startLng: number | null = null;
    endLat: number | null = null;
    endLng: number | null = null;

    clickMode: 'start' | 'end' | null = null;
    loading = false;
    error: string | null = null;

    primaryRoute: RouteResult | null = null;
    alternativeRoute: RouteResult | null = null;

    private startIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28">
                <circle cx="16" cy="16" r="12" fill="#30D158" stroke="#ffffff" stroke-width="2" />
                <circle cx="16" cy="16" r="4" fill="#ffffff" />
            </svg>
        `),
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    private endIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28">
                <circle cx="16" cy="16" r="12" fill="#FF453A" stroke="#ffffff" stroke-width="2" />
                <circle cx="16" cy="16" r="4" fill="#ffffff" />
            </svg>
        `),
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    private potholeIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12">
                <circle cx="8" cy="8" r="6" fill="#ffd60a" stroke="#ffffff" stroke-width="1.5" />
            </svg>
        `),
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    constructor(private http: HttpClient, private apiService: ApiService) {}

    ngOnInit() {}

    ngAfterViewInit() {
        this.initMap();
    }

    ngOnDestroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }

    private initMap() {
        if (!this.mapContainer?.nativeElement) return;

        this.map = L.map(this.mapContainer.nativeElement, {
            center: [22.3072, 73.1812], // Vadodara Smart City Center
            zoom: 13,
            zoomControl: true,
            attributionControl: true
        });

        // Light voyager tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        this.routingLayer = L.layerGroup().addTo(this.map);
        this.markersLayer = L.layerGroup().addTo(this.map);

        // Click handler to set points
        this.map.on('click', (e: L.LeafletMouseEvent) => {
            if (this.clickMode === 'start') {
                this.setStartPoint(e.latlng.lat, e.latlng.lng);
            } else if (this.clickMode === 'end') {
                this.setEndPoint(e.latlng.lat, e.latlng.lng);
            }
        });

        setTimeout(() => this.map?.invalidateSize(), 300);
    }

    setClickMode(mode: 'start' | 'end') {
        this.clickMode = this.clickMode === mode ? null : mode;
        if (this.map && this.clickMode) {
            L.DomUtil.addClass(this.mapContainer.nativeElement, 'crosshair-cursor');
        } else {
            L.DomUtil.removeClass(this.mapContainer.nativeElement, 'crosshair-cursor');
        }
    }

    private setStartPoint(lat: number, lng: number) {
        this.startLat = lat;
        this.startLng = lng;
        this.clickMode = null;
        L.DomUtil.removeClass(this.mapContainer.nativeElement, 'crosshair-cursor');
        this.updateWaypoints();
    }

    private setEndPoint(lat: number, lng: number) {
        this.endLat = lat;
        this.endLng = lng;
        this.clickMode = null;
        L.DomUtil.removeClass(this.mapContainer.nativeElement, 'crosshair-cursor');
        this.updateWaypoints();
    }

    private updateWaypoints() {
        if (!this.map || !this.markersLayer) return;

        this.markersLayer.clearLayers();

        if (this.startLat !== null && this.startLng !== null) {
            L.marker([this.startLat, this.startLng], { icon: this.startIcon })
                .bindPopup('<strong style="color:var(--success);">Start Point</strong>')
                .addTo(this.markersLayer);
        }

        if (this.endLat !== null && this.endLng !== null) {
            L.marker([this.endLat, this.endLng], { icon: this.endIcon })
                .bindPopup('<strong style="color:var(--danger);">Destination Point</strong>')
                .addTo(this.markersLayer);
        }
    }

    findRoute() {
        if (this.startLat === null || this.endLat === null) return;

        this.loading = true;
        this.error = null;
        this.primaryRoute = null;
        this.alternativeRoute = null;
        this.routingLayer?.clearLayers();

        this.apiService.planRoute(
            [this.startLng!, this.startLat!],
            [this.endLng!, this.endLat!]
        ).subscribe({
            next: (res: any) => {
                this.loading = false;
                if (res.success && res.routes && res.routes.length > 0) {
                    this.primaryRoute = res.routes[0];
                    if (res.routes.length > 1) {
                        this.alternativeRoute = res.routes[1];
                    }
                    this.drawRoutes();
                } else {
                    this.error = 'No viable routes found between these points.';
                }
            },
            error: (err: any) => {
                this.loading = false;
                this.error = err.error?.error || 'Route safety calculation failed. OSRM route service error.';
                console.error(err);
            }
        });
    }

    private drawRoutes() {
        if (!this.map || !this.routingLayer || !this.primaryRoute) return;

        this.routingLayer.clearLayers();

        // 1. Draw Primary route (Blue line)
        const primaryLatLngs = this.primaryRoute.coordinates.map(c => [c[1], c[0]] as L.LatLngTuple);
        const primaryPolyline = L.polyline(primaryLatLngs, {
            color: '#007AFF',
            weight: 5,
            opacity: 0.85
        }).addTo(this.routingLayer);

        // 2. Draw Alternative route (Dimmer Gray line)
        if (this.alternativeRoute) {
            const altLatLngs = this.alternativeRoute.coordinates.map(c => [c[1], c[0]] as L.LatLngTuple);
            L.polyline(altLatLngs, {
                color: '#8e8e93',
                weight: 4,
                opacity: 0.5,
                dashArray: '5, 8'
            }).addTo(this.routingLayer);
        }

        // 3. Draw potholes along the route
        this.primaryRoute.potholes.forEach((pot: any) => {
            const coords = pot.location?.coordinates;
            if (coords && coords.length >= 2) {
                const marker = L.marker([coords[1], coords[0]], { icon: this.potholeIcon });
                const popupContent = `
                    <div style="font-size: 11px;">
                        <strong>Pothole Hazard</strong><br>
                        Severity: <span class="severity-badge-mini severity-${pot.severity}">${pot.severity}</span>
                    </div>
                `;
                marker.bindPopup(popupContent).addTo(this.routingLayer!);
            }
        });

        // Zoom to fit path
        const bounds = primaryPolyline.getBounds();
        this.map.fitBounds(bounds.pad(0.15));
    }

    useAlternativeRoute() {
        if (!this.alternativeRoute) return;
        const temp = this.primaryRoute;
        this.primaryRoute = this.alternativeRoute;
        this.alternativeRoute = temp;
        this.drawRoutes();
    }

    clearAll() {
        this.startLat = null;
        this.startLng = null;
        this.endLat = null;
        this.endLng = null;
        this.clickMode = null;
        this.primaryRoute = null;
        this.alternativeRoute = null;
        this.error = null;

        this.routingLayer?.clearLayers();
        this.markersLayer?.clearLayers();

        if (this.map) {
            this.map.setView([22.3072, 73.1812], 13);
            L.DomUtil.removeClass(this.mapContainer.nativeElement, 'crosshair-cursor');
        }
    }

    // Colors mapping helpers
    getSafetyColor(score: number): string {
        if (score > 80) return '#30D158'; // green
        if (score > 50) return '#FF9F0A'; // orange
        return '#FF453A'; // red
    }

    getSafetyGradient(score: number): string {
        if (score > 80) return 'var(--success)';
        if (score > 50) return 'var(--warning)';
        return 'var(--danger)';
    }

    getSeverityColor(label: string): string {
        const map: any = {
            low: '#30D158',
            medium: '#FFD60A',
            high: '#FF9F0A',
            critical: '#FF453A'
        };
        return map[label.toLowerCase()] || 'var(--text-secondary)';
    }

    getPotholeSeverityBreakdown(potholes: any[]) {
        const counts: { [key: string]: number } = { low: 0, medium: 0, high: 0, critical: 0 };
        potholes.forEach(p => {
            const sev = (p.severity || 'low').toLowerCase();
            counts[sev] = (counts[sev] || 0) + 1;
        });

        return Object.keys(counts).map(k => ({
            severity: k,
            count: counts[k]
        })).filter(item => item.count > 0);
    }

    formatDistance(m: number): string {
        if (m < 1000) return `${m.toFixed(0)} m`;
        return `${(m / 1000).toFixed(2)} km`;
    }

    formatDuration(s: number): string {
        if (s < 60) return `${s.toFixed(0)}s`;
        const m = Math.floor(s / 60);
        return `${m} min`;
    }
}
