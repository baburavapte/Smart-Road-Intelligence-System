import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { KPICardComponent } from '../shared/kpi-card.component';
import { CircularRingComponent } from '../shared/circular-ring.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-public-dashboard',
  standalone: true,
  imports: [CommonModule, KPICardComponent, CircularRingComponent, StatusBadgeComponent],
  template: `
    <div class="public-dashboard-container animate-fade-in">
      <header class="public-header glass-card">
        <div class="header-logo-row">
          <div class="logo-badge">RI</div>
          <div class="header-titles">
            <h1 class="page-title" style="font-size: 24px;">Vadodara Road Health</h1>
            <p class="page-header-subtitle">Public Transparency Dashboard · Live</p>
          </div>
        </div>
        <div class="header-meta-row">
          <span class="meta-badge"><i class="ti ti-clock"></i> Updated hourly</span>
          <button class="btn-secondary btn-share" (click)="shareDashboard()">
            <i class="ti ti-share"></i> Share Dashboard
          </button>
        </div>
      </header>

      <!-- 4 Stat Tiles -->
      <section class="public-stats-grid">
        <app-kpi-card label="Total Reported" [value]="stats.totalReported" trendBadge="This Month" badgeClass="badge-success" accentClass="accent-roads"></app-kpi-card>
        <app-kpi-card label="Total Resolved" [value]="stats.totalResolved" trendBadge="Active Repairs" badgeClass="badge-success" accentClass="accent-resolved"></app-kpi-card>
        <app-kpi-card label="Avg Resolution Time" [value]="stats.avgResolution" trendBadge="Target: 5 days" badgeClass="badge-success" accentClass="accent-pending"></app-kpi-card>
        <div class="glass-card circular-score-card">
          <app-circular-ring [score]="cityHealthScore" unit="City Health"></app-circular-ring>
        </div>
      </section>

      <!-- Map & Worst Roads Row -->
      <div class="public-content-grid">
        <!-- Left: Pothole Density Heatmap -->
        <main class="map-card glass-card">
          <div class="card-header-row">
            <h2 class="section-title">City Pothole Density Heatmap</h2>
            <p class="card-desc">Anonymized geospatial concentration of active detections. Sensitive citizen data is excluded.</p>
          </div>
          <div class="map-viewport-wrapper">
            <div #mapContainer class="leaflet-map"></div>
          </div>
        </main>

        <!-- Right: Top 5 Worst Roads -->
        <aside class="worst-roads-card glass-card">
          <h2 class="section-title">Top 5 Degraded Roads</h2>
          <p class="card-desc">Ranked by Priority Score formula incorporating severity impact & citizen complaints.</p>
          
          <div class="worst-list" *ngIf="worstRoads.length > 0">
            <div class="worst-item" *ngFor="let road of worstRoads; let i = index">
              <div class="rank-badge" [class.rank-critical]="i < 2">{{ i + 1 }}</div>
              <div class="road-info">
                <h3>{{ road.roadName }}</h3>
                <span class="road-meta">{{ road.zone || 'Central' }} · {{ road.totalPotholes }} potholes</span>
              </div>
              <div class="road-score-wrapper">
                <span class="road-score text-danger">{{ road.priorityScore || road.healthScore }}</span>
                <span class="card-label" style="font-size: 8px;">Score</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- Bottom Layout Section -->
      <section class="public-bottom-grid">
        <!-- Col 1: Recently Resolved Timeline -->
        <div class="glass-card timeline-card">
          <h2 class="section-title">Recently Resolved repairs</h2>
          <p class="card-desc">Last 10 pothole issues fixed by city crews.</p>
          
          <div class="timeline-vertical">
            <div class="timeline-item" *ngFor="let record of recentRepairs">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <h4>{{ record.roadName }}</h4>
                  <span class="timeline-date">{{ record.repairDate | date:'mediumDate' }}</span>
                </div>
                <p class="timeline-desc">{{ record.repairNotes || 'Pothole patch complete.' }}</p>
                <div class="timeline-team-row">
                  <span class="team-badge"><i class="ti ti-users"></i> Crew: {{ record.repairTeam }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Col 2: SLA & Quality Commitments -->
        <div class="glass-card commitment-card">
          <h2 class="section-title">Municipal SLA Commitment</h2>
          <p class="card-desc">Our targets for resolving reported potholes based on severity levels.</p>

          <div class="sla-commitments-list">
            <div class="sla-commit-item">
              <app-status-badge status="critical" type="severity"></app-status-badge>
              <span class="sla-days">3 Days Limit</span>
            </div>
            <div class="sla-commit-item">
              <app-status-badge status="medium" type="severity"></app-status-badge>
              <span class="sla-days">7 Days Limit</span>
            </div>
            <div class="sla-commit-item">
              <app-status-badge status="low" type="severity"></app-status-badge>
              <span class="sla-days">14 Days Limit</span>
            </div>
          </div>

          <div class="compliance-metric">
            <div class="circular-score-small">
              <span class="compliance-value">94.2%</span>
              <span class="card-label">SLA Compliance</span>
            </div>
            <p class="compliance-desc">
              Vadodara City has resolved 94.2% of reported potholes within their specified SLA times this month.
            </p>
          </div>
        </div>
      </section>

      <!-- Share toast notification -->
      <div class="share-toast glass-card" *ngIf="showShareToast">
        <i class="ti ti-circle-check text-success"></i>
        <span>Link copied to clipboard! Share the dashboard.</span>
      </div>

      <footer class="public-footer">
        <p>Data updates every hour | Powered by Smart Road Intelligence System</p>
        <p class="copy-text">&copy; {{ currentYear }} Vadodara Municipal Corporation</p>
      </footer>
    </div>
  `,
  styles: [`
    .public-dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px 32px 80px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    
    .public-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 32px;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .header-logo-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-badge {
      width: 40px;
      height: 40px;
      background: var(--color-primary);
      color: white;
      font-weight: 700;
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-titles h1 {
      margin: 0;
    }

    .header-meta-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .meta-badge {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-muted);
      background: rgba(0, 0, 0, 0.04);
      padding: 4px 10px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .public-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .circular-score-card {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .public-content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    @media (max-width: 900px) {
      .public-content-grid {
        grid-template-columns: 1fr;
      }
    }

    .map-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .map-viewport-wrapper {
      width: 100%;
      height: 400px;
      border-radius: 16px;
      overflow: hidden;
    }

    .leaflet-map {
      width: 100%;
      height: 100%;
    }

    .worst-roads-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .worst-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .worst-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.02);
      border-radius: 12px;
      border: 0.5px solid rgba(0, 0, 0, 0.04);
    }

    .rank-badge {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: rgba(0, 122, 255, 0.1);
      color: var(--color-primary);
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .rank-badge.rank-critical {
      background: rgba(255, 69, 58, 0.12);
      color: var(--color-danger);
    }

    .road-info {
      flex: 1;
    }

    .road-info h3 {
      font-size: 13px;
      font-weight: 600;
      margin: 0;
      color: var(--color-text);
    }

    .road-meta {
      font-size: 11px;
      color: var(--color-muted);
    }

    .road-score-wrapper {
      text-align: center;
    }

    .road-score {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 700;
      display: block;
    }

    .public-bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 768px) {
      .public-bottom-grid {
        grid-template-columns: 1fr;
      }
    }

    .timeline-card, .commitment-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .timeline-vertical {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 300px;
      overflow-y: auto;
      padding-right: 8px;
    }

    .timeline-item {
      display: flex;
      gap: 16px;
      position: relative;
    }

    .timeline-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--color-success);
      margin-top: 4px;
      flex-shrink: 0;
      box-shadow: 0 0 0 3px rgba(48, 209, 88, 0.15);
    }

    .timeline-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .timeline-header h4 {
      font-size: 13px;
      font-weight: 600;
      margin: 0;
    }

    .timeline-date {
      font-size: 11px;
      color: var(--color-muted);
    }

    .timeline-desc {
      font-size: 12px;
      color: var(--color-muted);
      line-height: 1.4;
    }

    .timeline-team-row {
      display: flex;
      gap: 8px;
    }

    .team-badge {
      font-size: 10px;
      color: var(--color-primary);
      background: rgba(0, 122, 255, 0.08);
      padding: 2px 6px;
      border-radius: 6px;
      font-weight: 500;
    }

    .sla-commitments-list {
      display: flex;
      justify-content: space-around;
      padding: 12px;
      background: rgba(0, 0, 0, 0.02);
      border-radius: 12px;
    }

    .sla-commit-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .sla-days {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text);
    }

    .compliance-metric {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 12px;
    }

    .circular-score-small {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: 3px solid var(--color-success);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(48, 209, 88, 0.05);
      flex-shrink: 0;
    }

    .compliance-value {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: var(--color-success);
    }

    .compliance-desc {
      font-size: 12px;
      color: var(--color-muted);
      line-height: 1.4;
    }

    .share-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 100;
      border-left: 4px solid var(--color-success);
    }

    .public-footer {
      text-align: center;
      margin-top: 24px;
      color: var(--color-muted);
      font-size: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .copy-text {
      font-size: 11px;
    }
  `]
})
export class PublicDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  currentYear = new Date().getFullYear();
  cityHealthScore = 84;
  showShareToast = false;

  stats = {
    totalReported: '1,248',
    totalResolved: '1,175',
    avgResolution: '4.2 Days'
  };

  worstRoads: any[] = [];
  recentRepairs: any[] = [];

  private map!: L.Map;
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }

  private loadData() {
    // Load worst roads from API
    this.apiService.getRoadPriority().subscribe(res => {
      if (res.success && res.data) {
        this.worstRoads = res.data.slice(0, 5);
      }
    });

    // Load recent repairs from API
    this.apiService.getRepairRecords().subscribe(res => {
      if (res.success && res.data) {
        this.recentRepairs = res.data.slice(0, 10).map((r: any) => ({
          roadName: r.roadHealthId?.roadName || 'Main Street',
          repairDate: r.repairDate,
          repairNotes: r.repairNotes,
          repairTeam: r.repairTeam
        }));
      }
    });

    // Load road health scores to get city health score average
    this.apiService.getRoadHealth().subscribe(res => {
      if (res.success && res.data && res.data.length > 0) {
        const sum = res.data.reduce((acc: number, cur: any) => acc + cur.healthScore, 0);
        this.cityHealthScore = Math.round(sum / res.data.length);
      }
    });
  }

  private initMap() {
    // Default location: Vadodara City center [22.3072, 73.1812]
    const center = L.latLng(22.3072, 73.1812);
    
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false,
      attributionControl: false
    }).setView(center, 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(this.map);

    // Fetch pothole locations to draw simple density circles (markers with sizing)
    this.apiService.getGeoJSON().subscribe(res => {
      if (res && res.features) {
        res.features.forEach((feature: any) => {
          const coords = feature.geometry.coordinates; // [lng, lat]
          const severity = feature.properties.severity || 'low';
          
          let radius = 100;
          let color = '#30D158';
          if (severity === 'critical') { radius = 250; color = '#FF453A'; }
          else if (severity === 'high') { radius = 200; color = '#ff9f0a'; }
          else if (severity === 'medium') { radius = 150; color = '#FFD60A'; }

          L.circle([coords[1], coords[0]], {
            color: color,
            fillColor: color,
            fillOpacity: 0.25,
            radius: radius,
            weight: 1
          }).addTo(this.map);
        });
      }
    });
  }

  shareDashboard() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.showShareToast = true;
      setTimeout(() => this.showShareToast = false, 3000);
    });
  }
}
