import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface RoadHealth {
  _id: string;
  roadName: string;
  healthScore: number;
  healthCategory: 'healthy' | 'medium_risk' | 'poor' | 'critical';
  totalPotholes: number;
  avgSeverityWeight: number;
  lastCalculated: string;
  history: { score: number; calculatedAt: string }[];
  boundingBox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

@Component({
  selector: 'app-road-health',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="container">
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">Road Health Index</h1>
            <p class="page-header-subtitle">Analyze pavement degradation velocity, repair urgency, and condition forecasting models</p>
          </div>
          <div class="page-header-actions">
            <button class="btn-primary" (click)="recalculateScores()" [disabled]="calculating">
              <span *ngIf="calculating" class="spinner-inline"></span>
              <i class="ti ti-calculator" *ngIf="!calculating" aria-hidden="true"></i> {{ calculating ? 'Calculating...' : 'Recalculate Scores' }}
            </button>
            <button class="btn-secondary" (click)="toggleNewRoadForm()">
              <i class="ti" [class.ti-plus]="!showForm" [class.ti-x]="showForm" aria-hidden="true"></i> {{ showForm ? 'Close Form' : 'Define Road Zone' }}
            </button>
          </div>
        </header>

        <!-- New Road Form Card Overlay -->
        <div class="new-road-card-wrapper animate-scale-in" *ngIf="showForm">
          <div class="new-road-form glass-panel">
            <div class="form-header-row">
              <h4>Define New Road Zone Boundary</h4>
              <button class="btn-close" (click)="showForm = false" aria-label="Close form">✕</button>
            </div>
            <div class="form-grid">
              <div class="form-group full-width">
                <label for="roadName">Road Segment Name</label>
                <input type="text" id="roadName" [(ngModel)]="newRoad.roadName" placeholder="e.g. Outer Ring Road, Sector 5" class="form-input">
              </div>
              <div class="form-group">
                <label for="minLat">Min Latitude</label>
                <input type="number" id="minLat" step="0.00001" [(ngModel)]="newRoad.minLat" class="form-input">
              </div>
              <div class="form-group">
                <label for="maxLat">Max Latitude</label>
                <input type="number" id="maxLat" step="0.00001" [(ngModel)]="newRoad.maxLat" class="form-input">
              </div>
              <div class="form-group">
                <label for="minLng">Min Longitude</label>
                <input type="number" id="minLng" step="0.00001" [(ngModel)]="newRoad.minLng" class="form-input">
              </div>
              <div class="form-group">
                <label for="maxLng">Max Longitude</label>
                <input type="number" id="maxLng" step="0.00001" [(ngModel)]="newRoad.maxLng" class="form-input">
              </div>
            </div>
            <div class="form-actions-row">
              <button class="btn-primary" (click)="submitNewRoad()" [disabled]="submittingRoad">
                <span *ngIf="submittingRoad" class="spinner-inline"></span> Submit Zone
              </button>
              <button class="btn-secondary" (click)="showForm = false">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Grid: Table + Side Details -->
        <div class="health-grid animate-fade-in-up" style="animation-delay: 0.05s">
          <!-- Left Column: Table List -->
          <main class="main-column">
            <div class="table-card glass-card">
              <div class="table-card-header">
                <h3 class="section-title-alt">Monitored Segments</h3>
                <p class="section-subtitle-alt">Click any row to execute forecasting analysis</p>
              </div>

              <div class="table-wrapper">
                <table class="health-table">
                  <thead>
                    <tr>
                      <th>Road Segment</th>
                      <th>Health Index</th>
                      <th>Status Category</th>
                      <th class="text-center">Potholes</th>
                      <th>Calculation Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let road of roads" (click)="selectRoad(road)" [class.selected-row]="selectedRoad?._id === road._id">
                      <td class="road-name-cell">{{ road.roadName }}</td>
                      <td>
                        <div class="score-pill-container">
                          <span class="score-num font-outfit" [ngClass]="'color-' + road.healthCategory">{{ road.healthScore }}</span>
                          <div class="bar-bg"><div class="bar-fill" [ngClass]="'bg-' + road.healthCategory" [style.width.%]="road.healthScore"></div></div>
                        </div>
                      </td>
                      <td>
                        <span class="category-badge" [ngClass]="'badge-' + road.healthCategory">
                          {{ getCategoryLabel(road.healthCategory) }}
                        </span>
                      </td>
                      <td class="text-center" style="font-weight: 500;">{{ road.totalPotholes }}</td>
                      <td class="date-text">{{ formatDate(road.lastCalculated) }}</td>
                    </tr>
                    <tr *ngIf="roads.length === 0">
                      <td colspan="5" class="empty-cell">No roads defined. Define a new road zone to start monitoring pavement degradation.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </main>

          <!-- Right Column: Details & Forecast -->
          <aside class="details-column">
            <!-- Road details found -->
            <div class="details-card glass-card animate-scale-in" *ngIf="selectedRoad">
              <header class="details-card-header">
                <h3 class="details-title">{{ selectedRoad.roadName }}</h3>
                <span class="category-badge" [ngClass]="'badge-' + selectedRoad.healthCategory">
                  {{ getCategoryLabel(selectedRoad.healthCategory) }}
                </span>
              </header>
              
              <!-- Circular RHI Progress Ring SVG -->
              <div class="health-circular-section">
                <svg viewBox="0 0 100 100" class="circular-svg-health">
                  <circle cx="50" cy="50" r="42" class="svg-track-health"></circle>
                  <circle cx="50" cy="50" r="42" class="svg-fill-health" 
                    [ngClass]="'stroke-' + selectedRoad.healthCategory" 
                    [style.stroke-dashoffset]="getCircleDashOffset(selectedRoad.healthScore)"></circle>
                  <text x="50" y="55" text-anchor="middle" class="svg-text-health">{{ selectedRoad.healthScore }}</text>
                </svg>
                <div class="health-stats-text">
                  <span class="health-grade-text" [ngClass]="'color-' + selectedRoad.healthCategory">{{ getCategoryLabel(selectedRoad.healthCategory) }} Status</span>
                  <span class="health-desc-text">Selected Road Health Score (RHI)</span>
                </div>
              </div>

              <!-- Core Metrics Grid -->
              <div class="metrics-grid">
                <div class="metric-item">
                  <span class="m-label">Active Potholes</span>
                  <span class="m-val font-outfit">{{ selectedRoad.totalPotholes }}</span>
                </div>
                <div class="metric-item">
                  <span class="m-label">Degradation Wt</span>
                  <span class="m-val font-outfit" style="color: var(--primary);">{{ selectedRoad.avgSeverityWeight.toFixed(2) }}</span>
                </div>
              </div>

              <!-- History Sparkline -->
              <div class="detail-section">
                <h4 class="section-sub">RHI Trend History</h4>
                <div class="sparkline-container" *ngIf="selectedRoad.history && selectedRoad.history.length >= 2">
                  <svg class="sparkline-svg" viewBox="0 0 300 100">
                    <defs>
                      <!-- Gradient for Area fill under the polyline -->
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.15" />
                        <stop offset="100%" stop-color="var(--primary)" stop-opacity="0" />
                      </linearGradient>
                    </defs>
                    <!-- Grid Lines -->
                    <line x1="0" y1="25" x2="300" y2="25" stroke="rgba(0,0,0,0.04)" stroke-dasharray="3,3" />
                    <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(0,0,0,0.04)" stroke-dasharray="3,3" />
                    <line x1="0" y1="75" x2="300" y2="75" stroke="rgba(0,0,0,0.04)" stroke-dasharray="3,3" />
                    
                    <!-- Area Polygon Fill -->
                    <polygon
                      [attr.points]="getSparklineAreaPoints(selectedRoad.history)"
                      fill="url(#areaGrad)"
                    />
                    <!-- Path line -->
                    <polyline
                      fill="none"
                      stroke="var(--primary)"
                      stroke-width="2.5"
                      [attr.points]="getSparklinePoints(selectedRoad.history)"
                    />
                  </svg>
                  <div class="sparkline-labels">
                    <span>Older Runs</span>
                    <span>Recent Run</span>
                  </div>
                </div>
                <p class="no-history-text" *ngIf="!selectedRoad.history || selectedRoad.history.length < 2">
                  Not enough historical calculations to display trend.
                </p>
              </div>

              <!-- Forecasting section -->
              <div class="detail-section" *ngIf="forecast">
                <h4 class="section-sub">Linear Regression Forecasts</h4>
                
                <div class="forecast-indicators-row">
                  <div class="ind-item">
                    <span class="ind-lbl">Regression Trend</span>
                    <span class="ind-val text-uppercase" [ngClass]="'trend-' + forecast.trend">
                      <i class="ti" [class.ti-trending-down]="forecast.trend === 'declining'" [class.ti-trending-up]="forecast.trend === 'improving'" [class.ti-minus]="forecast.trend === 'stable'" aria-hidden="true"></i> {{ forecast.trend }}
                    </span>
                  </div>
                  <div class="ind-item">
                    <span class="ind-lbl">Model Confidence</span>
                    <span class="ind-val">{{ forecast.confidence }}</span>
                  </div>
                </div>

                <div class="forecast-pills-row">
                  <div class="f-pill glass-card">
                    <span class="fp-lbl">30 Days</span>
                    <span class="fp-val font-outfit" [ngClass]="'color-' + getCategoryByScore(forecast.day30)">{{ forecast.day30 }}</span>
                  </div>
                  <div class="f-pill glass-card">
                    <span class="fp-lbl">60 Days</span>
                    <span class="fp-val font-outfit" [ngClass]="'color-' + getCategoryByScore(forecast.day60)">{{ forecast.day60 }}</span>
                  </div>
                  <div class="f-pill glass-card">
                    <span class="fp-lbl">90 Days</span>
                    <span class="fp-val font-outfit" [ngClass]="'color-' + getCategoryByScore(forecast.day90)">{{ forecast.day90 }}</span>
                  </div>
                </div>

                <!-- Warning if projected critical status -->
                <div class="forecast-warning-box animate-scale-in" *ngIf="forecast.trend === 'declining' && forecast.day90 <= 25">
                  <span class="warn-icon" aria-hidden="true">⚠️</span>
                  <div class="warn-body">
                    <h5>Critical Failure Warning</h5>
                    <p>Linear projections indicate RHI &le; 25 within the next 90 days. Schedule preventative patching.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty Details Screen -->
            <div class="details-card glass-card empty-details" *ngIf="!selectedRoad">
              <div class="empty-icon" aria-hidden="true">📈</div>
              <h3>No Road Selected</h3>
              <p>Select a monitored segment from the table to calculate RHI gradients, regression models, and project degradation velocity.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .new-road-card-wrapper {
      margin-bottom: 24px;
      max-width: 600px;
    }

    .form-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .form-header-row h4 {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .btn-close {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 16px;
      cursor: pointer;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .full-width {
      grid-column: span 4;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-group label {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .form-actions-row {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    /* Grid configuration */
    .health-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 24px;
      align-items: start;
    }

    .main-column {
      display: flex;
      flex-direction: column;
    }

    .table-card {
      padding: 0;
      overflow: hidden;
    }

    .table-card-header {
      padding: 24px 24px 16px;
    }

    .section-title-alt {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .section-subtitle-alt {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .health-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .health-table th {
      padding: 12px 20px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      font-weight: 600;
      text-align: left;
      border-bottom: 0.5px solid var(--border-tint);
      background: rgba(0,0,0,0.01);
    }

    .health-table td {
      padding: 14px 20px;
      border-bottom: 0.5px solid var(--border-tint);
      cursor: pointer;
      font-size: 13.5px;
      vertical-align: middle;
      transition: background 0.15s ease;
    }

    .health-table tbody tr:hover {
      background: rgba(0, 122, 255, 0.015);
    }

    .health-table tbody tr.selected-row {
      background: rgba(0, 122, 255, 0.04);
    }

    .road-name-cell {
      font-weight: 600;
      color: var(--text-primary);
    }

    .score-pill-container {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 160px;
    }

    .score-num {
      width: 24px;
      font-weight: 700;
      text-align: right;
    }

    .bar-bg {
      flex: 1;
      height: 5px;
      background: rgba(0, 0, 0, 0.04);
      border-radius: 3px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 3px;
    }

    .text-center {
      text-align: center;
    }

    .date-text, .empty-cell {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .empty-cell {
      text-align: center;
      padding: 40px;
    }

    /* Category Badges styling */
    .category-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border: 0.5px solid transparent;
    }

    .badge-healthy { background: rgba(48, 209, 88, 0.08); color: #248a3d; border-color: rgba(48, 209, 88, 0.15); }
    .badge-medium_risk { background: rgba(255, 214, 10, 0.1); color: #8a6d00; border-color: rgba(255, 214, 10, 0.15); }
    .badge-poor { background: rgba(255, 159, 10, 0.1); color: #b85c00; border-color: rgba(255, 159, 10, 0.15); }
    .badge-critical { background: rgba(255, 69, 58, 0.08); color: #d70015; border-color: rgba(255, 69, 58, 0.15); }

    .color-healthy { color: #248a3d; }
    .color-medium_risk { color: #8a6d00; }
    .color-poor { color: #b85c00; }
    .color-critical { color: #d70015; }

    .bg-healthy { background: #30d158; }
    .bg-medium_risk { background: #ffd60a; }
    .bg-poor { background: #ff9f0a; }
    .bg-critical { background: #ff453a; }

    /* Right column */
    .details-column {
      position: sticky;
      top: 20px;
    }

    .details-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .details-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .details-title {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Circular SVG health ring */
    .health-circular-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin: 8px 0;
    }

    .circular-svg-health {
      width: 90px;
      height: 90px;
      transform: rotate(-90deg);
    }

    .svg-track-health {
      fill: none;
      stroke: rgba(0, 0, 0, 0.04);
      stroke-width: 7px;
    }

    .svg-fill-health {
      fill: none;
      stroke-width: 7px;
      stroke-linecap: round;
      stroke-dasharray: 263.89; /* 2 * PI * 42 */
      transition: stroke-dashoffset 0.6s ease;
    }

    .stroke-healthy { stroke: var(--success); }
    .stroke-medium_risk { stroke: var(--warning); }
    .stroke-poor { stroke: #ff9f0a; }
    .stroke-critical { stroke: var(--danger); }

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

    .health-desc-text {
      font-size: 11px;
      color: var(--text-secondary);
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .metric-item {
      background: rgba(0,0,0,0.02);
      border: 0.5px solid rgba(0,0,0,0.04);
      border-radius: 14px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .m-label {
      font-size: 10px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-weight: 600;
      margin-bottom: 2px;
    }

    .m-val {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .detail-section {
      border-top: 0.5px solid rgba(0,0,0,0.05);
      padding-top: 16px;
    }

    .section-sub {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    /* Sparkline line with area gradient */
    .sparkline-container {
      background: rgba(0,0,0,0.01);
      border: 0.5px solid rgba(0,0,0,0.04);
      border-radius: 14px;
      padding: 10px;
    }

    .sparkline-svg {
      width: 100%;
      height: 80px;
    }

    .sparkline-labels {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: var(--text-secondary);
      margin-top: 4px;
      font-weight: 500;
    }

    .no-history-text {
      font-size: 12px;
      color: var(--text-secondary);
      font-style: italic;
    }

    /* Regression indicators */
    .forecast-indicators-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .ind-item {
      display: flex;
      flex-direction: column;
    }

    .ind-lbl {
      font-size: 9.5px;
      color: var(--text-secondary);
      text-transform: uppercase;
      font-weight: 600;
    }

    .ind-val {
      font-weight: 600;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .trend-declining { color: var(--danger); }
    .trend-improving { color: var(--success); }
    .trend-stable { color: var(--text-secondary); }

    .forecast-pills-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .f-pill {
      padding: 10px 6px;
      text-align: center;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 4px rgba(0,0,0,0.02) !important;
    }

    .fp-lbl {
      font-size: 9px;
      color: var(--text-secondary);
      text-transform: uppercase;
      margin-bottom: 2px;
      font-weight: 600;
    }

    .fp-val {
      font-size: 16px;
      font-weight: 700;
    }

    .forecast-warning-box {
      display: flex;
      gap: 10px;
      background: rgba(255, 69, 58, 0.06);
      border: 0.5px solid rgba(255, 69, 58, 0.2);
      border-radius: 14px;
      padding: 12px;
      margin-top: 16px;
    }

    .warn-icon {
      font-size: 18px;
    }

    .warn-body h5 {
      color: #d70015;
      font-size: 12.5px;
      margin-bottom: 2px;
      font-weight: 600;
    }

    .warn-body p {
      font-size: 11px;
      color: var(--text-primary);
      line-height: 1.35;
    }

    .empty-details {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      min-height: 320px;
      gap: 8px;
    }

    .empty-details h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 600;
    }

    .empty-details p {
      font-size: 12.5px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .spinner-inline {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-right-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 992px) {
      .health-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RoadHealthComponent implements OnInit {
  roads: RoadHealth[] = [];
  selectedRoad: RoadHealth | null = null;
  forecast: any = null;
  loading: boolean = false;
  calculating: boolean = false;
  showForm: boolean = false;
  submittingRoad: boolean = false;

  newRoad = {
    roadName: '',
    minLat: 0,
    maxLat: 0,
    minLng: 0,
    maxLng: 0
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadRoads();
  }

  loadRoads(): void {
    this.loading = true;
    this.apiService.getRoadHealth().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.roads = res.data;
          // Select first road by default
          if (this.roads.length > 0) {
            this.selectRoad(this.roads[0]);
          }
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Failed to load road health:', err);
      }
    });
  }

  selectRoad(road: RoadHealth): void {
    this.selectedRoad = road;
    this.forecast = null;
    
    // Fetch forecast details
    this.apiService.getRoadForecast(road._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.forecast = res.forecast;
        }
      },
      error: (err) => {
        console.error('Failed to load forecast for road:', err);
      }
    });
  }

  recalculateScores(): void {
    this.calculating = true;
    this.apiService.calculateRoadHealth().subscribe({
      next: (res) => {
        this.calculating = false;
        if (res.success) {
          this.loadRoads();
        }
      },
      error: (err) => {
        this.calculating = false;
        console.error('Failed to recalculate scores:', err);
      }
    });
  }

  toggleNewRoadForm(): void {
    this.showForm = !this.showForm;
  }

  submitNewRoad(): void {
    if (!this.newRoad.roadName.trim()) return;

    this.submittingRoad = true;
    const body = {
      roadName: this.newRoad.roadName,
      boundingBox: {
        minLat: this.newRoad.minLat,
        maxLat: this.newRoad.maxLat,
        minLng: this.newRoad.minLng,
        maxLng: this.newRoad.maxLng
      }
    };

    this.apiService.createRoad(body.roadName, body.boundingBox).subscribe({
      next: (res) => {
        this.submittingRoad = false;
        if (res.success) {
          this.showForm = false;
          this.newRoad = { roadName: '', minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
          this.loadRoads();
        }
      },
      error: (err) => {
        this.submittingRoad = false;
        console.error('Failed to create road zone:', err);
      }
    });
  }

  // Circle meter offset calculation
  getCircleDashOffset(score: number): number {
    const r = 42;
    const circ = 2 * Math.PI * r;
    return circ * (1 - score / 100);
  }

  getCategoryLabel(cat: string): string {
    const map: any = {
      healthy: 'Healthy',
      medium_risk: 'Medium Risk',
      poor: 'Poor',
      critical: 'Critical'
    };
    return map[cat] || cat;
  }

  getCategoryByScore(score: number): string {
    if (score > 75) return 'healthy';
    if (score > 50) return 'medium_risk';
    if (score > 25) return 'poor';
    return 'critical';
  }

  getSparklinePoints(history: { score: number }[]): string {
    if (!history || history.length < 2) return '';
    const width = 300;
    const height = 100;
    const padding = 10;
    const chartHeight = height - padding * 2;
    const step = width / (history.length - 1);

    return history.map((pt, idx) => {
      const x = idx * step;
      const y = padding + (100 - pt.score) / 100 * chartHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  getSparklineAreaPoints(history: { score: number }[]): string {
    const polyPoints = this.getSparklinePoints(history);
    if (!polyPoints) return '';
    const width = 300;
    const height = 90; // Bottom limit inside chart bounds
    return `${polyPoints} ${width},${height} 0,${height}`;
  }

  formatDate(d: string): string {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
