import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.heat';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="page-container">
      <div class="container">
        <!-- Topbar -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">Road Intelligence</h1>
            <p class="page-header-subtitle">Vadodara Smart City · Live · Updated just now</p>
          </div>
          <div class="page-header-actions">
            <button class="btn-secondary" (click)="refreshData()" [disabled]="loading" title="Refresh data">
              <i class="ti ti-refresh" [class.spinning]="loading" aria-hidden="true"></i> Refresh
            </button>
            <a routerLink="/detect" class="btn-primary">
              <i class="ti ti-plus" aria-hidden="true"></i> New Report
            </a>
          </div>
        </header>

        <!-- KPI Cards Row -->
        <section class="kpi-grid animate-fade-in-up" aria-label="Key Performance Indicators">
          <div class="kpi-card glass-card accent-roads">
            <span class="kpi-title">Total Roads</span>
            <div class="kpi-value-row">
              <span class="kpi-value">2,847</span>
              <span class="kpi-badge badge-success">+12 this week</span>
            </div>
          </div>
          <div class="kpi-card glass-card accent-active">
            <span class="kpi-title">Active Potholes</span>
            <div class="kpi-value-row">
              <span class="kpi-value">{{ totalGeolocated }}</span>
              <span class="kpi-badge badge-danger">+23 today</span>
            </div>
          </div>
          <div class="kpi-card glass-card accent-resolved">
            <span class="kpi-title">Resolved</span>
            <div class="kpi-value-row">
              <span class="kpi-value">1,293</span>
              <span class="kpi-badge badge-success">89% rate</span>
            </div>
          </div>
          <div class="kpi-card glass-card accent-pending">
            <span class="kpi-title">Pending Review</span>
            <div class="kpi-value-row">
              <span class="kpi-value">47</span>
              <span class="kpi-badge badge-warning">Needs action</span>
            </div>
          </div>
          <div class="kpi-card glass-card accent-ai">
            <span class="kpi-title">AI Confidence</span>
            <div class="kpi-value-row">
              <span class="kpi-value">97.4%</span>
              <span class="kpi-badge badge-ai">Model v4.2</span>
            </div>
          </div>
        </section>

        <!-- Grid Container: Map Hero + Right Panel -->
        <div class="dashboard-columns-grid animate-fade-in-up" style="animation-delay: 0.05s">
          <!-- Left Column: Map Hero Panel (~68% width) -->
          <main class="map-hero-panel glass-card">
            <div class="map-wrapper-container">
              <!-- Leaflet Map Element -->
              <div #mapContainer id="dashboard-map" class="leaflet-fullmap"></div>

              <!-- Floating Search Bar (Top Left) -->
              <div class="floating-search-bar glass-card">
                <i class="ti ti-search search-icon" aria-hidden="true"></i>
                <input type="text" placeholder="Search roads, zones…" class="search-input" aria-label="Search roads and zones">
              </div>

              <!-- Floating Layer Switcher (Top Right) -->
              <nav class="floating-layer-switcher glass-card" aria-label="Map layers">
                <button [class.active]="viewMode === 'markers'" (click)="setViewMode('markers')">Markers</button>
                <button [class.active]="viewMode === 'heatmap'" (click)="setViewMode('heatmap')">Heatmap</button>
                <button [class.active]="viewMode === 'roadhealth'" (click)="setViewMode('roadhealth')">Health</button>
                <button [class.active]="viewMode === 'forecast'" (click)="setViewMode('forecast')">Forecast</button>
              </nav>

              <!-- Floating Map Navigation controls (Bottom Right) -->
              <div class="floating-map-controls">
                <button class="map-control-btn glass-card" (click)="zoomIn()" title="Zoom In" aria-label="Zoom In">+</button>
                <button class="map-control-btn glass-card" (click)="zoomOut()" title="Zoom Out" aria-label="Zoom Out">−</button>
                <button class="map-control-btn glass-card" (click)="locate()" title="Recenter Location" aria-label="Recenter Location"><i class="ti ti-current-location"></i></button>
                <button class="map-control-btn glass-card" (click)="toggleLayer()" title="Toggle View Mode" aria-label="Toggle View Mode"><i class="ti ti-layers-difference"></i></button>
              </div>

              <!-- Floating Legend (Bottom Left) -->
              <div class="floating-legend-card glass-card">
                <!-- Markers View Mode Legend -->
                <div *ngIf="viewMode === 'markers'" class="legend-content">
                  <span class="legend-header">Severity Scale</span>
                  <div class="legend-item"><span class="legend-dot color-critical"></span> Critical</div>
                  <div class="legend-item"><span class="legend-dot color-high"></span> High</div>
                  <div class="legend-item"><span class="legend-dot color-medium"></span> Moderate</div>
                  <div class="legend-item"><span class="legend-dot color-low"></span> Low</div>
                </div>

                <!-- Heatmap View Mode Legend -->
                <div *ngIf="viewMode === 'heatmap'" class="legend-content">
                  <span class="legend-header">Density Heatmap</span>
                  <div class="legend-bar-gradient"></div>
                  <div class="legend-labels">
                    <span>Low Density</span>
                    <span>High Density</span>
                  </div>
                </div>

                <!-- Road Health View Mode Legend -->
                <div *ngIf="viewMode === 'roadhealth'" class="legend-content">
                  <span class="legend-header">Road Health Index</span>
                  <div class="legend-items-list">
                    <div class="legend-item"><span class="legend-dot color-success"></span> Healthy (76-100)</div>
                    <div class="legend-item"><span class="legend-dot color-medium"></span> Medium Risk (51-75)</div>
                    <div class="legend-item"><span class="legend-dot color-poor"></span> Poor (26-50)</div>
                    <div class="legend-item"><span class="legend-dot color-critical"></span> Critical (0-25)</div>
                  </div>
                </div>

                <!-- Forecast View Mode Legend -->
                <div *ngIf="viewMode === 'forecast'" class="legend-content">
                  <span class="legend-header">Failure Forecasting</span>
                  <div class="legend-item"><span class="legend-dot color-forecast"></span> Critical Failure (90d)</div>
                </div>
              </div>

              <!-- Loading Indicator Spinner Overlay -->
              <div class="map-loading-overlay glass-card" *ngIf="loading">
                <span class="spinner" aria-hidden="true"></span>
                <p>Retrieving pothole data...</p>
              </div>

              <!-- Empty State Overlay -->
              <div class="empty-overlay glass-card animate-scale-in" *ngIf="!loading && totalGeolocated === 0 && viewMode === 'markers'">
                <h3>No Mapped Reports</h3>
                <p>Geolocate pothole detections to display coordinates on Vadodara's grid.</p>
                <a routerLink="/detect" class="btn-primary" style="margin-top: 12px">Upload Image</a>
              </div>

              <!-- Error Banner Overlay -->
              <div class="error-overlay glass-card animate-scale-in" *ngIf="error">
                <h3>System Error</h3>
                <p>{{ error }}</p>
                <button class="btn-secondary" (click)="refreshData()">Try Again</button>
              </div>
            </div>
          </main>

          <!-- Right Column: Analytical Panel Columns (~32% width) -->
          <aside class="dashboard-side-column">
            <!-- Card 1: Road Health Score circular SVG meter -->
            <div class="side-panel-card glass-card">
              <h4 class="card-title">Road Health Index</h4>
              <div class="health-circular-section">
                <svg viewBox="0 0 100 100" class="circular-svg-health">
                  <circle cx="50" cy="50" r="42" class="svg-track-health"></circle>
                  <circle cx="50" cy="50" r="42" class="svg-fill-health" style="stroke: var(--success); stroke-dashoffset: 65.9;"></circle>
                  <text x="50" y="55" text-anchor="middle" class="svg-text-health">74</text>
                </svg>
                <div class="health-stats-text">
                  <span class="health-grade-text color-success-text">Healthy Grade</span>
                  <span class="health-desc-text">Overall Vadodara City Health</span>
                </div>
              </div>

              <div class="zone-bars-list">
                <div class="zone-bar-item">
                  <div class="zone-label-row">
                    <span class="zone-name">Zone A (Alkapuri)</span>
                    <span class="zone-score font-outfit">85 RHI</span>
                  </div>
                  <div class="zone-track">
                    <div class="zone-fill fill-green" style="width: 85%;"></div>
                  </div>
                </div>

                <div class="zone-bar-item">
                  <div class="zone-label-row">
                    <span class="zone-name">Zone B (Vasna)</span>
                    <span class="zone-score font-outfit">62 RHI</span>
                  </div>
                  <div class="zone-track">
                    <div class="zone-fill fill-yellow" style="width: 62%;"></div>
                  </div>
                </div>

                <div class="zone-bar-item">
                  <div class="zone-label-row">
                    <span class="zone-name">Zone C (Gotri)</span>
                    <span class="zone-score font-outfit">48 RHI</span>
                  </div>
                  <div class="zone-track">
                    <div class="zone-fill fill-orange" style="width: 48%;"></div>
                  </div>
                </div>

                <div class="zone-bar-item">
                  <div class="zone-label-row">
                    <span class="zone-name">Zone D (Akota)</span>
                    <span class="zone-score font-outfit">76 RHI</span>
                  </div>
                  <div class="zone-track">
                    <div class="zone-fill fill-green" style="width: 76%;"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 2: Detection Activity mini spark bar chart -->
            <div class="side-panel-card glass-card">
              <h4 class="card-title">Detection Activity</h4>
              <div class="activity-bars-chart">
                <div class="chart-bar-column" *ngFor="let h of [15, 30, 20, 45, 60, 40, 95]">
                  <div class="chart-bar-fill" [style.height.%]="h" [class.highlight-today]="h === 95"></div>
                </div>
              </div>
              <div class="chart-labels-row">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span class="highlight-today-lbl">Today</span>
              </div>
            </div>

            <!-- Card 3: Alert Notifications widget -->
            <div class="side-panel-card glass-card notifications-widget-card">
              <h4 class="card-title">System Alerts</h4>
              <div class="widgets-notifications-list">
                <div class="widget-notif-item">
                  <div class="notif-indicator color-critical-bg"></div>
                  <div class="notif-msg-content">
                    <span class="notif-msg-title">Critical Pothole Reported</span>
                    <span class="notif-msg-meta">Vasna Road Intersection · 10m ago</span>
                  </div>
                </div>

                <div class="widget-notif-item">
                  <div class="notif-indicator color-warning-bg"></div>
                  <div class="notif-msg-content">
                    <span class="notif-msg-title">Road Health Warning</span>
                    <span class="notif-msg-meta">Gotri Road Segment C · 2h ago</span>
                  </div>
                </div>

                <div class="widget-notif-item">
                  <div class="notif-indicator color-success-bg"></div>
                  <div class="notif-msg-content">
                    <span class="notif-msg-title">Repair Completed (Proof Uploaded)</span>
                    <span class="notif-msg-meta">Alkapuri Underpass · 5h ago</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <!-- Bottom Row: 3 columns -->
        <section class="dashboard-bottom-row animate-fade-in-up" style="animation-delay: 0.1s" aria-label="Extended analysis and actions">
          <!-- Card 1: Recent Reports -->
          <div class="bottom-panel-card glass-card">
            <div class="panel-card-header">
              <h4 class="card-title">Recent Reports</h4>
              <a routerLink="/citizen-dashboard" class="card-action-link">View all</a>
            </div>
            <div class="bottom-list">
              <div class="bottom-list-item">
                <span class="severity-badge-mini severity-critical">Critical</span>
                <div class="bottom-list-text">
                  <span class="bottom-list-title">Akota Bridge Roadway</span>
                  <span class="bottom-list-meta">Assigned to Crew A · 5m ago</span>
                </div>
              </div>

              <div class="bottom-list-item">
                <span class="severity-badge-mini severity-medium">Moderate</span>
                <div class="bottom-list-text">
                  <span class="bottom-list-title">Gotri Main Crossing</span>
                  <span class="bottom-list-meta">Under review · 1h ago</span>
                </div>
              </div>

              <div class="bottom-list-item">
                <span class="severity-badge-mini severity-low">Low</span>
                <div class="bottom-list-text">
                  <span class="bottom-list-title">Alkapuri Service Road</span>
                  <span class="bottom-list-meta">Verified · 4h ago</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Forecast -->
          <div class="bottom-panel-card glass-card">
            <div class="panel-card-header">
              <h4 class="card-title">AI Degradation Forecast</h4>
              <nav class="forecast-segmented-control" aria-label="Forecast period">
                <button class="forecast-control-btn active">7d</button>
                <button class="forecast-control-btn">30d</button>
              </nav>
            </div>
            <div class="bottom-list">
              <div class="bottom-list-item">
                <span class="forecast-status-dot color-forecast-dot"></span>
                <div class="bottom-list-text">
                  <span class="bottom-list-title">Gotri Road Segment C</span>
                  <span class="bottom-list-meta">AI Forecast · High confidence of critical status</span>
                </div>
              </div>

              <div class="bottom-list-item">
                <span class="forecast-status-dot color-warning-dot"></span>
                <div class="bottom-list-text">
                  <span class="bottom-list-title">Vasna Road crossing</span>
                  <span class="bottom-list-meta">AI Forecast · Moderate risk of degradation</span>
                </div>
              </div>

              <div class="bottom-list-item">
                <span class="forecast-status-dot color-success-dot"></span>
                <div class="bottom-list-text">
                  <span class="bottom-list-title">Akota Lane 3 Segment</span>
                  <span class="bottom-list-meta">AI Forecast · Stable road status expected</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 3: Quick Actions -->
          <div class="bottom-panel-card glass-card">
            <div class="panel-card-header">
              <h4 class="card-title">Quick Actions</h4>
            </div>
            <div class="quick-actions-list">
              <button class="quick-action-btn" type="button" aria-label="Escalate critical reports to municipal crews">
                <span class="action-icon-square color-danger-bg"><i class="ti ti-alert-triangle"></i></span>
                <span class="action-btn-label">Escalate Critical Reports</span>
              </button>

              <button class="quick-action-btn" type="button" aria-label="Export municipal health report to PDF">
                <span class="action-icon-square color-blue-bg"><i class="ti ti-file-export"></i></span>
                <span class="action-btn-label">Export Report PDF</span>
              </button>

              <a routerLink="/route-safety" class="quick-action-btn">
                <span class="action-icon-square color-success-bg"><i class="ti ti-map-2"></i></span>
                <span class="action-btn-label">Safe Route Planner</span>
              </a>

              <a routerLink="/detect" class="quick-action-btn">
                <span class="action-icon-square color-forecast-bg"><i class="ti ti-camera"></i></span>
                <span class="action-btn-label">Run AI Detection</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
    styles: [`
      /* Layout structure */
      .page-container {
        padding: 40px 0 80px;
        background: transparent;
      }

      /* KPI Cards styling override */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        margin-bottom: 32px;
      }

      .kpi-card {
        padding: 20px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 104px;
        position: relative;
        overflow: hidden;
      }

      .kpi-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2.5px;
        border-radius: 20px 20px 0 0;
      }

      .accent-roads::before { background: var(--primary); }
      .accent-active::before { background: var(--danger); }
      .accent-resolved::before { background: var(--success); }
      .accent-pending::before { background: var(--warning); }
      .accent-ai::before { background: var(--forecast); }

      .kpi-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-secondary);
        letter-spacing: 0.5px;
      }

      .kpi-value-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: 10px;
      }

      .kpi-value {
        font-family: 'Outfit', sans-serif;
        font-size: 26px;
        font-weight: 600;
        color: var(--text-primary);
        letter-spacing: -0.5px;
        line-height: 1;
      }

      .kpi-badge {
        font-size: 10px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 20px;
      }

      .badge-success { background: rgba(48, 209, 88, 0.12); color: #248a3d; }
      .badge-danger { background: rgba(255, 69, 58, 0.12); color: #d70015; }
      .badge-warning { background: rgba(255, 214, 10, 0.15); color: #8a6d00; }
      .badge-ai { background: rgba(191, 90, 242, 0.12); color: #8f2fce; }

      /* Map and right panel layout */
      .dashboard-columns-grid {
        display: grid;
        grid-template-columns: 2.3fr 1fr;
        gap: 24px;
        align-items: start;
        margin-bottom: 32px;
      }

      .map-hero-panel {
        padding: 0;
        overflow: hidden;
        border-radius: 24px !important;
        position: relative;
        z-index: 10;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
      }

      .map-wrapper-container {
        position: relative;
        width: 100%;
        height: 520px;
        overflow: hidden;
      }

      .leaflet-fullmap {
        width: 100%;
        height: 100%;
        z-index: 1;
      }

      /* Floating controls ON the map */
      .floating-search-bar {
        position: absolute;
        top: 20px;
        left: 20px;
        z-index: 1000;
        width: 240px;
        background: rgba(255, 255, 255, 0.85) !important;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 14px !important;
        display: flex;
        align-items: center;
        padding: 10px 14px;
        gap: 8px;
      }

      .search-icon {
        color: var(--text-secondary);
        font-size: 16px;
      }

      .search-input {
        border: none;
        background: transparent;
        color: var(--text-primary);
        font-size: 13px;
        font-family: inherit;
        outline: none;
        width: 100%;
      }

      .floating-layer-switcher {
        position: absolute;
        top: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        background: rgba(255, 255, 255, 0.72) !important;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 20px !important;
        padding: 3px;
        gap: 2px;
      }

      .floating-layer-switcher button {
        border: none;
        background: transparent;
        padding: 6px 14px;
        border-radius: 18px;
        font-family: inherit;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: var(--transition);
      }

      .floating-layer-switcher button.active {
        background: var(--primary);
        color: white;
        box-shadow: 0 2px 6px rgba(0, 122, 255, 0.15);
      }

      .floating-map-controls {
        position: absolute;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .map-control-btn {
        width: 36px;
        height: 36px;
        border-radius: 10px !important;
        background: rgba(255, 255, 255, 0.82) !important;
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: 0.5px solid rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: var(--text-primary);
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
      }

      .map-control-btn:hover {
        background: white !important;
        transform: scale(1.05);
      }

      .floating-legend-card {
        position: absolute;
        bottom: 20px;
        left: 20px;
        z-index: 1000;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.85) !important;
        border-radius: 14px !important;
        min-width: 140px;
      }

      .legend-header {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-secondary);
        letter-spacing: 0.4px;
        display: block;
        margin-bottom: 6px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--text-primary);
        margin-bottom: 4px;
      }
      .legend-item:last-child {
        margin-bottom: 0;
      }

      .legend-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        display: inline-block;
      }

      .legend-bar-gradient {
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, #00cec9, #55efc4, #fdcb6e, #e17055, #d63031);
        margin-bottom: 4px;
      }

      .legend-labels {
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: var(--text-secondary);
      }

      .legend-items-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .color-critical { background: var(--danger); }
      .color-high { background: #FF9F0A; }
      .color-medium { background: var(--warning); }
      .color-low { background: var(--success); }
      .color-success { background: var(--success); }
      .color-poor { background: #e17055; }
      .color-forecast { background: var(--forecast); }

      /* Right Sidebar Cards */
      .dashboard-side-column {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .side-panel-card {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .health-circular-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .circular-svg-health {
        width: 82px;
        height: 82px;
        transform: rotate(-90deg);
      }

      .svg-track-health {
        fill: none;
        stroke: rgba(0, 0, 0, 0.04);
        stroke-width: 6px;
      }

      .svg-fill-health {
        fill: none;
        stroke-width: 6px;
        stroke-linecap: round;
        stroke-dasharray: 263.89; /* 2 * PI * 42 */
      }

      .svg-text-health {
        font-family: 'Outfit', sans-serif;
        font-size: 24px;
        font-weight: 700;
        fill: var(--text-primary);
        transform: rotate(90deg);
        transform-origin: center;
      }

      .health-stats-text {
        text-align: center;
        display: flex;
        flex-direction: column;
      }

      .health-grade-text {
        font-size: 13.5px;
        font-weight: 600;
      }

      .color-success-text { color: #248a3d; }

      .health-desc-text {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .zone-bars-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .zone-bar-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .zone-label-row {
        display: flex;
        justify-content: space-between;
        font-size: 11.5px;
        font-weight: 500;
      }

      .zone-name { color: var(--text-primary); }
      .zone-score { color: var(--text-secondary); }

      .zone-track {
        height: 5px;
        background: rgba(0, 0, 0, 0.04);
        border-radius: 3px;
        overflow: hidden;
      }

      .zone-fill {
        height: 100%;
        border-radius: 3px;
      }

      .fill-green { background: var(--success); }
      .fill-yellow { background: var(--warning); }
      .fill-orange { background: #e17055; }

      /* Activity chart bars */
      .activity-bars-chart {
        height: 64px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        padding: 0 4px;
        gap: 8px;
      }

      .chart-bar-column {
        flex: 1;
        height: 100%;
        display: flex;
        align-items: flex-end;
      }

      .chart-bar-fill {
        width: 100%;
        border-radius: 4px 4px 0 0;
        background: var(--primary);
        opacity: 0.15;
        transition: var(--transition);
      }

      .chart-bar-fill.highlight-today {
        opacity: 1;
        box-shadow: 0 1px 6px rgba(0, 122, 255, 0.2);
      }

      .chart-labels-row {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: var(--text-secondary);
        font-weight: 500;
        padding: 0 2px;
      }

      .highlight-today-lbl {
        color: var(--primary);
        font-weight: 600;
      }

      /* Alert Notifications widget inside Sidebar */
      .widgets-notifications-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .widget-notif-item {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding-bottom: 10px;
        border-bottom: 0.5px solid rgba(0,0,0,0.04);
      }
      .widget-notif-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .notif-indicator {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        margin-top: 5px;
        flex-shrink: 0;
      }

      .color-critical-bg { background: var(--danger); }
      .color-warning-bg { background: var(--warning); }
      .color-success-bg { background: var(--success); }

      .notif-msg-content {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      .notif-msg-title {
        font-size: 12.5px;
        font-weight: 500;
        color: var(--text-primary);
      }

      .notif-msg-meta {
        font-size: 10px;
        color: var(--text-secondary);
      }

      /* Bottom Columns Row */
      .dashboard-bottom-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }

      .bottom-panel-card {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .panel-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .card-action-link {
        font-size: 11px;
        font-weight: 600;
        color: var(--primary);
        text-decoration: none;
      }
      .card-action-link:hover {
        text-decoration: underline;
      }

      .forecast-segmented-control {
        display: flex;
        background: rgba(0, 0, 0, 0.04);
        padding: 2px;
        border-radius: 12px;
      }

      .forecast-control-btn {
        border: none;
        background: transparent;
        padding: 3px 10px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        color: var(--text-secondary);
        cursor: pointer;
      }

      .forecast-control-btn.active {
        background: white;
        color: var(--primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .bottom-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .bottom-list-item {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .bottom-list-text {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      .bottom-list-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
      }

      .bottom-list-meta {
        font-size: 10.5px;
        color: var(--text-secondary);
      }

      .forecast-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .color-forecast-dot { background: var(--forecast); }
      .color-warning-dot { background: var(--warning); }
      .color-success-dot { background: var(--success); }

      /* Quick Actions Buttons */
      .quick-actions-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .quick-action-btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(0, 0, 0, 0.02);
        border: 0.5px solid rgba(0, 0, 0, 0.04);
        border-radius: 14px;
        padding: 8px 12px;
        text-align: left;
        cursor: pointer;
        transition: var(--transition);
        text-decoration: none;
      }

      .quick-action-btn:hover {
        background: rgba(0, 0, 0, 0.04);
        transform: scale(1.01);
      }

      .action-icon-square {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: white;
      }

      .color-danger-bg { background: var(--danger); }
      .color-blue-bg { background: var(--primary); }
      .color-success-bg { background: var(--success); }
      .color-forecast-bg { background: var(--forecast); }

      .action-btn-label {
        font-size: 12.5px;
        font-weight: 500;
        color: var(--text-primary);
      }

      /* Loader Spinner overlays */
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

      .empty-overlay, .error-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1001;
        text-align: center;
        padding: 32px;
        max-width: 320px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .empty-overlay h3, .error-overlay h3 {
        font-family: 'Outfit', sans-serif;
        font-size: 16px;
        font-weight: 600;
      }

      .empty-overlay p, .error-overlay p {
        font-size: 12.5px;
        color: var(--text-secondary);
        line-height: 1.4;
      }

      .spinner {
        width: 30px;
        height: 30px;
        border: 3px solid rgba(0, 0, 0, 0.05);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .ti.spinning {
        animation: spin 1s linear infinite;
        display: inline-block;
      }

      /* Custom Marker Animation */
      :host ::ng-deep .pulse-marker-critical {
        animation: critical-pulse-ring 1.5s ease-out infinite;
      }

      @keyframes critical-pulse-ring {
        0% { filter: drop-shadow(0 0 0px rgba(255, 69, 58, 0.7)); }
        100% { filter: drop-shadow(0 0 8px rgba(255, 69, 58, 0)); }
      }

      /* Responsive rules */
      @media (max-width: 1200px) {
        .dashboard-columns-grid {
          grid-template-columns: 1fr;
        }
        .dashboard-side-column {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .dashboard-bottom-row {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 900px) {
        .kpi-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        .dashboard-side-column {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .kpi-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .floating-search-bar {
          width: 180px;
        }
        .floating-layer-switcher button {
          padding: 6px 8px;
          font-size: 10px;
        }
      }
    `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('mapContainer') mapContainer!: ElementRef;

    private map: L.Map | null = null;
    private clusterGroup: L.MarkerClusterGroup | null = null;
    private heatLayer: any = null;
    private geoData: any = null;
    roadHealthLayer: L.FeatureGroup | null = null;
    forecastLayer: L.FeatureGroup | null = null;

    viewMode: 'markers' | 'heatmap' | 'roadhealth' | 'forecast' = 'markers';
    loading = true;
    error: string | null = null;
    totalGeolocated = 0;
    severityCounts: { [key: string]: number } = {};

    // Severity-based marker colors
    private readonly severityColors: { [key: string]: { fill: string; stroke: string } } = {
        'none': { fill: '#30d158', stroke: '#ffffff' },
        'low': { fill: '#30d158', stroke: '#ffffff' },
        'medium': { fill: '#ffd60a', stroke: '#ffffff' },
        'high': { fill: '#ff9f0a', stroke: '#ffffff' },
        'critical': { fill: '#ff453a', stroke: '#ffffff' }
    };

    // Severity weights for heatmap intensity
    private readonly severityWeights: { [key: string]: number } = {
        'none': 0.1,
        'low': 0.3,
        'medium': 0.5,
        'high': 0.8,
        'critical': 1.0
    };

    constructor(private apiService: ApiService) { }

    ngOnInit() { }

    ngAfterViewInit() {
        this.initMap();
        this.loadGeoData();
    }

    ngOnDestroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }

    // Custom Map zoom controls
    zoomIn() {
        this.map?.zoomIn();
    }

    zoomOut() {
        this.map?.zoomOut();
    }

    locate() {
        // Recenter to Vadodara Smart City coordinates
        this.map?.setView([22.3072, 73.1812], 13);
    }

    toggleLayer() {
        this.setViewMode(this.viewMode === 'markers' ? 'heatmap' : 'markers');
    }

    setViewMode(mode: 'markers' | 'heatmap' | 'roadhealth' | 'forecast') {
        if (this.viewMode === mode) return;
        this.viewMode = mode;
        this.applyViewMode();
    }

    private applyViewMode() {
        if (!this.map) return;

        const safeRemove = (layer: any) => {
            if (layer && this.map?.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
        };

        if (this.clusterGroup) safeRemove(this.clusterGroup);
        safeRemove(this.heatLayer);
        safeRemove(this.roadHealthLayer);
        safeRemove(this.forecastLayer);

        if (this.viewMode === 'markers') {
            if (this.clusterGroup) this.map.addLayer(this.clusterGroup);
        } else if (this.viewMode === 'heatmap') {
            if (this.heatLayer) {
                this.map.addLayer(this.heatLayer);
            } else if (this.geoData) {
                this.buildHeatLayer(this.geoData);
                if (this.heatLayer) this.map.addLayer(this.heatLayer);
            }
        } else if (this.viewMode === 'roadhealth') {
            if (this.roadHealthLayer) {
                this.map.addLayer(this.roadHealthLayer);
            } else {
                this.loadRoadHealthLayer();
            }
        } else if (this.viewMode === 'forecast') {
            if (this.forecastLayer) {
                this.map.addLayer(this.forecastLayer);
            } else {
                this.loadForecastLayer();
            }
        }
    }

    private loadRoadHealthLayer() {
        this.loading = true;
        this.apiService.getRoadHealthGeoJSON().subscribe({
            next: (res) => {
                this.loading = false;
                this.roadHealthLayer = L.featureGroup();
                const features = res.features || [];

                features.forEach((feature: any) => {
                    const props = feature.properties;
                    const coords = feature.geometry.coordinates; // [lng, lat]
                    const category = props.healthCategory || 'healthy';
                    const score = props.healthScore;

                    const colors: any = {
                        healthy: { fill: '#30d158', stroke: '#248a3d' },
                        medium_risk: { fill: '#ffd60a', stroke: '#a68a00' },
                        poor: { fill: '#ff9f0a', stroke: '#c93400' },
                        critical: { fill: '#ff453a', stroke: '#d70015' }
                    };
                    const color = colors[category] || colors.healthy;

                    const popupContent = `
                        <div style="font-family:'SF Pro Display', 'Inter', sans-serif; padding:16px; min-width:220px; color:#1D1D1F;">
                            <h4 style="margin:0 0 6px 0; font-size:14px; font-weight:600; color:#1d1d1f;">${props.roadName}</h4>
                            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
                                <span style="color:#6E6E73;">Health Score:</span>
                                <span style="font-weight:700; color:${color.fill === '#30d158' ? '#248a3d' : color.fill};">${score}/100</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:12px;">
                                <span style="color:#6E6E73;">Total Potholes:</span>
                                <span style="font-weight:700; color:#1D1D1F;">${props.totalPotholes}</span>
                            </div>
                            <div style="margin-top:10px;">
                                <a href="/road-health" style="display:block; text-align:center; padding:6px 12px; background:#007AFF; color:white; border-radius:14px; font-size:11px; text-decoration:none; font-weight:500;">View Details</a>
                            </div>
                        </div>
                    `;

                    if (props.boundingBox && props.boundingBox.minLat) {
                        const bounds = L.latLngBounds(
                            [props.boundingBox.minLat, props.boundingBox.minLng],
                            [props.boundingBox.maxLat, props.boundingBox.maxLng]
                        );
                        const rect = L.rectangle(bounds, {
                            color: color.stroke,
                            weight: 1.5,
                            fillColor: color.fill,
                            fillOpacity: 0.15
                        }).bindPopup(popupContent);
                        this.roadHealthLayer?.addLayer(rect);
                    } else if (coords && coords.length >= 2) {
                        const marker = L.circleMarker([coords[1], coords[0]], {
                            radius: 12,
                            color: color.stroke,
                            weight: 1.5,
                            fillColor: color.fill,
                            fillOpacity: 0.5
                        }).bindPopup(popupContent);
                        this.roadHealthLayer?.addLayer(marker);
                    }
                });

                if (this.map && this.viewMode === 'roadhealth') {
                    this.map.addLayer(this.roadHealthLayer);
                }
            },
            error: (err) => {
                this.loading = false;
                console.error('Failed to load road health layer:', err);
            }
        });
    }

    private loadForecastLayer() {
        this.loading = true;
        this.apiService.getCriticalForecasts().subscribe({
            next: (res) => {
                this.loading = false;
                this.forecastLayer = L.featureGroup();
                const roads = res.data || [];

                roads.forEach((road: any) => {
                    const coords = road.centerCoordinates; // [lng, lat]
                    if (!coords || coords.length < 2) return;

                    const svgStr = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 56" width="34" height="48">
                            <path d="M20 0 C8.95 0 0 8.95 0 20 C0 35 20 56 20 56 S40 35 40 20 C40 8.95 31.05 0 20 0Z" fill="#BF5AF2" stroke="#ffffff" stroke-width="2"/>
                            <circle cx="20" cy="19" r="8" fill="#ffffff" opacity="0.9"/>
                            <text x="20" y="24" text-anchor="middle" font-size="12" font-weight="bold" fill="#BF5AF2">🔮</text>
                        </svg>`;
                    const icon = L.icon({
                        iconUrl: 'data:image/svg+xml;base64,' + btoa(svgStr),
                        iconSize: [30, 42],
                        iconAnchor: [15, 42],
                        popupAnchor: [0, -42]
                    });

                    const popupContent = `
                        <div style="font-family:'SF Pro Display', 'Inter', sans-serif; padding:16px; min-width:230px; color:#1D1D1F;">
                            <h4 style="margin:0 0 6px 0; font-size:13px; font-weight:600; color:#BF5AF2;">🔮 Projected Failure Warning</h4>
                            <p style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:#1d1d1f;">${road.roadName}</p>
                            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
                                <span style="color:#6E6E73;">Current RHI:</span>
                                <span style="font-weight:700; color:#1D1D1F;">${road.currentScore}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
                                <span style="color:#6E6E73;">Predicted (90d):</span>
                                <span style="font-weight:700; color:#ff453a;">${road.predictedScore90} (Critical)</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
                                <span style="color:#6E6E73;">Days to Critical:</span>
                                <span style="font-weight:700; color:#ff9f0a;">~${road.estimatedDaysToCritical} Days</span>
                            </div>
                            <div style="margin-top:10px;">
                                <a href="/road-health" style="display:block; text-align:center; padding:6px 12px; background:#BF5AF2; color:white; border-radius:14px; font-size:11px; text-decoration:none; font-weight:500;">View Forecasts</a>
                            </div>
                        </div>
                    `;

                    const marker = L.marker([coords[1], coords[0]], { icon }).bindPopup(popupContent);
                    this.forecastLayer?.addLayer(marker);
                });

                if (this.map && this.viewMode === 'forecast') {
                    this.map.addLayer(this.forecastLayer);
                }
            },
            error: (err) => {
                this.loading = false;
                console.error('Failed to load critical forecasts layer:', err);
            }
        });
    }

    private initMap() {
        if (!this.mapContainer?.nativeElement) return;

        this.map = L.map(this.mapContainer.nativeElement, {
            center: [22.3072, 73.1812], // Center directly on Vadodara Smart City
            zoom: 13,
            zoomControl: false, // Hide standard controls to overlay custom glass controls
            attributionControl: true
        });

        // Crisp vector tiles (Light themes CartoDB Positron)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        // Initialize cluster group
        this.clusterGroup = (L as any).markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (cluster: any) => {
                const count = cluster.getChildCount();
                let size = 'small';
                if (count >= 10) size = 'medium';
                if (count >= 50) size = 'large';
                return L.divIcon({
                    html: `<div>${count}</div>`,
                    className: `marker-cluster marker-cluster-${size}`,
                    iconSize: L.point(40, 40)
                });
            }
        });

        this.map.addLayer(this.clusterGroup!);
    }

    private createSeverityIcon(severity: string): L.Icon {
        const colors = this.severityColors[severity] || this.severityColors['none'];
        const isCritical = severity === 'critical';
        const svgStr = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28">
                <circle cx="16" cy="16" r="12" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.5" />
                <circle cx="16" cy="16" r="5" fill="#ffffff" />
            </svg>`;
        return L.icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa(svgStr),
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
            className: isCritical ? 'pulse-marker-critical' : ''
        });
    }

    loadGeoData() {
        this.loading = true;
        this.error = null;

        this.apiService.getGeoJSON().subscribe({
            next: (geojson) => {
                this.loading = false;
                this.geoData = geojson;
                this.processGeoJSON(geojson);
            },
            error: (err) => {
                this.loading = false;
                this.error = 'Failed to load map data. Please check the server connection.';
                console.error('GeoJSON error:', err);
            }
        });
    }

    private processGeoJSON(geojson: any) {
        if (!this.clusterGroup || !this.map) return;

        // Clear existing layers
        this.clusterGroup.clearLayers();
        if (this.heatLayer) {
            this.map.removeLayer(this.heatLayer);
            this.heatLayer = null;
        }
        this.severityCounts = {};

        const features = geojson.features || [];
        this.totalGeolocated = features.length;

        if (features.length === 0) return;

        const markers: L.Marker[] = [];

        features.forEach((feature: any) => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates; // [lng, lat]
            const severity = props.severity || 'none';

            // Count severities
            this.severityCounts[severity] = (this.severityCounts[severity] || 0) + 1;

            if (coords && coords.length >= 2) {
                const icon = this.createSeverityIcon(severity);
                const popupContent = `
                    <div style="font-family:'SF Pro Display', 'Inter', sans-serif; padding:16px; min-width:200px; color:#1D1D1F;">
                        <h4 style="margin:0 0 6px 0; font-size:13px; font-weight:600; color:#1d1d1f; text-transform:capitalize;">Pothole Detected</h4>
                        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12.5px;">
                            <span style="color:#6E6E73;">Severity:</span>
                            <span style="font-weight:700;" class="severity-badge-mini severity-${severity}">${severity}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:12.5px;">
                            <span style="color:#6E6E73;">Reported:</span>
                            <span style="font-weight:500; color:#1D1D1F;">${this.formatDate(props.createdAt || '')}</span>
                        </div>
                        <div style="margin-top:10px;">
                            <a href="/results/${props.detectionId || ''}" style="display:block; text-align:center; padding:6px 12px; background:#007AFF; color:white; border-radius:14px; font-size:11px; text-decoration:none; font-weight:500;">View Analysis</a>
                        </div>
                    </div>
                `;

                const marker = L.marker([coords[1], coords[0]], { icon }).bindPopup(popupContent);
                markers.push(marker);
                this.clusterGroup?.addLayer(marker);
            }
        });

        // Apply mode layer
        if (this.viewMode === 'markers') {
            // Adjust bounds to geolocations
            if (markers.length > 0) {
                const group = L.featureGroup(markers);
                this.map.fitBounds(group.getBounds().pad(0.1));
            }
        } else if (this.viewMode === 'heatmap') {
            this.buildHeatLayer(geojson);
        }
    }

    private buildHeatLayer(geojson: any) {
        if (!this.map) return;
        const features = geojson.features || [];
        const heatPoints: any[] = [];

        features.forEach((feature: any) => {
            const coords = feature.geometry.coordinates;
            const props = feature.properties;
            const severity = props.severity || 'low';
            const weight = this.severityWeights[severity] || 0.5;

            if (coords && coords.length >= 2) {
                heatPoints.push([coords[1], coords[0], weight]);
            }
        });

        this.heatLayer = (L as any).heatLayer(heatPoints, {
            radius: 20,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.2: '#00cec9', 0.4: '#55efc4', 0.6: '#fdcb6e', 0.8: '#e17055', 1.0: '#d63031' }
        });
    }

    refreshData() {
        this.loadGeoData();
    }

    private formatDate(dateStr: string): string {
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
        });
    }
}
