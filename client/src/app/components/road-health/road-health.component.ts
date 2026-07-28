import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ZoneService } from '../../services/zone.service';
import { CircularRingComponent } from '../shared/circular-ring.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { HealthBarComponent } from '../shared/health-bar.component';
import { SkeletonComponent } from '../shared/skeleton.component';
import { ErrorCardComponent } from '../shared/error-card.component';
import { ToastService } from '../../services/toast.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

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
  imports: [CommonModule, FormsModule, CircularRingComponent, StatusBadgeComponent, HealthBarComponent, SkeletonComponent, ErrorCardComponent, RouterLink],
  template: `
    <div class="page-container flex-page">
      <div class="container">
        
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">Road Health Audit</h1>
            <p class="page-header-subtitle">Condition metrics, degradation velocity modeling, and budget return analytics.</p>
          </div>
          <div class="page-header-actions">
            <button class="btn-primary" (click)="recalculateScores()" [disabled]="calculating">
              {{ calculating ? 'Calculating...' : 'Recalculate Scores' }}
            </button>
            <button class="btn-secondary" (click)="toggleNewRoadForm()">
              {{ showForm ? 'Close Form' : 'Define Road Zone' }}
            </button>
          </div>
        </header>

        <!-- New Road Form -->
        <div class="new-road-card-wrapper animate-scale-in" *ngIf="showForm">
          <div class="new-road-form glass-panel">
            <div class="form-header-row">
              <h4>Define New Road Zone Boundary</h4>
              <button class="btn-ghost btn-sm" (click)="showForm = false">✕</button>
            </div>
            <div class="form-grid" style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group" style="grid-column: span 2;">
                <label class="card-label">Road Segment Name</label>
                <input type="text" [(ngModel)]="newRoad.roadName" placeholder="e.g. Alkapuri Cross Road" class="glass-input" />
              </div>
              <div class="form-group">
                <label class="card-label">Min Lat</label>
                <input type="number" step="0.0001" [(ngModel)]="newRoad.minLat" class="glass-input" />
              </div>
              <div class="form-group">
                <label class="card-label">Max Lat</label>
                <input type="number" step="0.0001" [(ngModel)]="newRoad.maxLat" class="glass-input" />
              </div>
              <div class="form-group">
                <label class="card-label">Min Lng</label>
                <input type="number" step="0.0001" [(ngModel)]="newRoad.minLng" class="glass-input" />
              </div>
              <div class="form-group">
                <label class="card-label">Max Lng</label>
                <input type="number" step="0.0001" [(ngModel)]="newRoad.maxLng" class="glass-input" />
              </div>
            </div>
            <div class="form-actions" style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn-primary" (click)="submitNewRoad()">Save Zone</button>
              <button class="btn-secondary" (click)="showForm = false">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Skeletons Loader -->
        <ng-container *ngIf="loading">
          <div class="rhi-overview-layout" style="margin-bottom: 24px;">
            <app-skeleton type="ring"></app-skeleton>
            <div class="zone-grid-cards">
              <app-skeleton type="card" *ngFor="let i of [1,2,3,4]"></app-skeleton>
            </div>
          </div>
          <app-skeleton type="chart" height="260px" style="margin-bottom: 24px;"></app-skeleton>
          <app-skeleton type="table" height="300px"></app-skeleton>
        </ng-container>

        <!-- Error Card -->
        <app-error-card
          *ngIf="!loading && error"
          [title]="'Failed to load health records'"
          [message]="'The system could not retrieve the road metrics.'"
          (retry)="loadData()">
        </app-error-card>

        <!-- Main Dashboard View -->
        <ng-container *ngIf="!loading && !error">
          <!-- Top RHI Overview Ring & Zone Grid -->
          <div class="rhi-overview-layout">
            <!-- Circular Ring Card -->
            <div class="glass-card circular-ring-large-card text-center">
              <app-circular-ring [score]="cityHealthScore" unit="City Index"></app-circular-ring>
              <p class="meta" style="margin-top: 12px;">Vadodara City Road Health Index (RHI) computed from geocoded AI data.</p>
            </div>

            <!-- Zone Cards Grid -->
            <div class="zone-grid-cards">
              <div class="glass-card zone-health-card" *ngFor="let zone of zones">
                <div class="zone-card-header">
                  <h3>{{ zone.name }}</h3>
                  <span class="zone-score" [style.color]="zone.score > 70 ? 'var(--color-success)' : (zone.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)')">{{ zone.score }} RHI</span>
                </div>
                <app-health-bar [value]="zone.score" [showValue]="false"></app-health-bar>
                <div class="zone-card-meta">
                  <span class="meta-trend"><i class="ti ti-trending-down text-danger"></i> Degrading</span>
                  <span class="meta-date">Last computed today</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Health Trend Chart -->
          <section class="glass-card chart-section-card flex-col">
            <div class="chart-header-row">
              <h2 class="section-title">RHI Health Trend & Predictions</h2>
              <div class="horizon-toggle">
                <button class="btn-secondary btn-sm" [class.active]="trendPeriod === 30" (click)="setTrendPeriod(30)">30 Days</button>
                <button class="btn-secondary btn-sm" [class.active]="trendPeriod === 60" (click)="setTrendPeriod(60)">60 Days</button>
                <button class="btn-secondary btn-sm" [class.active]="trendPeriod === 90" (click)="setTrendPeriod(90)">90 Days</button>
              </div>
            </div>
            <div style="position: relative; height: 260px; width: 100%;">
              <canvas id="healthTrendChart"></canvas>
            </div>
          </section>

          <!-- Section 3: Priority Rankings (Top 10 Worst Roads) -->
          <section class="glass-card priority-rankings-card flex-col">
            <h2 class="section-title">Top 10 Worst Roads</h2>
            <p class="card-desc">Ranked by standard priority score formula: 0.35 &times; Severity Impact + 0.25 &times; Complaint Volume + 0.25 &times; (1 - RHI/100) + 0.15 &times; Frequency</p>
            
            <!-- Table Empty State -->
            <div class="empty-state" *ngIf="priorityList.length === 0" style="padding: 24px;">
              <i class="ti ti-checklist" aria-hidden="true"></i>
              <h3>All roads cleared</h3>
              <p>No critical roads are ranked for priority repairs right now.</p>
            </div>

            <div class="table-scroll" *ngIf="priorityList.length > 0">
              <table class="priority-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Road Segment</th>
                    <th>Zone</th>
                    <th>Priority Score</th>
                    <th>RHI Score</th>
                    <th>Potholes</th>
                    <th>Active Complaints</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let road of priorityList; let i = index">
                    <td class="bold-td">{{ i + 1 }}</td>
                    <td class="bold-td">{{ road.roadName }}</td>
                    <td>{{ road.zone || 'Zone A' }}</td>
                    <td>
                      <span class="badge-priority text-danger">{{ road.priorityScore }}</span>
                    </td>
                    <td>{{ road.healthScore }}</td>
                    <td>{{ road.totalPotholes }}</td>
                    <td>{{ road.complaintCount }}</td>
                    <td>
                      <button class="btn-primary btn-sm" [routerLink]="['/admin/reports']">Schedule Repair</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Section 4: Budget vs ROI Panel -->
          <section class="glass-card budget-roi-card flex-col">
            <div class="chart-header-row">
              <h2 class="section-title">Budget vs Repair ROI Panel</h2>
              <button class="btn-ghost btn-sm" (click)="exportRoiCSV()"><i class="ti ti-download"></i> Export ROI CSV</button>
            </div>

            <div class="budget-columns">
              <!-- Left inputs -->
              <div class="budget-inputs flex-col" style="flex: 1;">
                <div class="budget-input-row" *ngFor="let zone of zones">
                  <label class="card-label" style="width: 80px;">{{ zone.name }} Budget</label>
                  <div class="input-symbol">
                    <span class="currency">₹</span>
                    <input type="number" [(ngModel)]="zone.budget" (input)="recalculateRoi()" class="glass-input inline-input" />
                  </div>
                  <div class="roi-metric-preview">
                    <span class="card-label">Spent: ₹{{ zone.spent.toLocaleString() }}</span>
                    <span class="roi-percentage text-success">ROI: {{ zone.roi | number:'1.2-2' }} ΔH/₹L</span>
                  </div>
                </div>
              </div>

              <!-- Right: Spent vs Budget bar chart -->
              <div style="flex: 1.2; position: relative; height: 200px;">
                <canvas id="budgetRoiChart"></canvas>
              </div>
            </div>
          </section>
        </ng-container>

      </div>
    </div>
  `,
  styles: [`
    .flex-page {
      display: flex;
      flex-direction: column;
      gap: 28px;
      padding-bottom: 80px;
    }

    .new-road-card-wrapper {
      margin-bottom: 12px;
    }

    .new-road-form {
      padding: 24px;
    }

    .form-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .rhi-overview-layout {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 24px;
    }

    @media (max-width: 1024px) {
      .rhi-overview-layout {
        grid-template-columns: 1fr;
      }
    }

    .circular-ring-large-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 28px;
    }

    .zone-grid-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 640px) {
      .zone-grid-cards {
        grid-template-columns: 1fr;
      }
    }

    .zone-health-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
    }

    .zone-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .zone-card-header h3 {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
    }

    .zone-score {
      font-size: 14px;
      font-weight: 700;
    }

    .zone-card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--color-muted);
    }

    .chart-section-card {
      padding: 24px;
    }

    .chart-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .horizon-toggle {
      display: flex;
      gap: 6px;
    }

    .priority-rankings-card {
      padding: 24px;
    }

    .card-desc {
      font-size: 12px;
      color: var(--color-muted);
      margin: -10px 0 20px 0;
      max-width: 700px;
      line-height: 1.4;
    }

    .table-scroll {
      width: 100%;
      overflow-x: auto;
    }

    .priority-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    .priority-table th {
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.02);
      color: var(--color-muted);
      font-weight: 600;
      border-bottom: 0.5px solid rgba(0,0,0,0.06);
    }

    .priority-table td {
      padding: 12px 16px;
      border-bottom: 0.5px solid rgba(0,0,0,0.04);
      vertical-align: middle;
    }

    .badge-priority {
      font-weight: 700;
      background: rgba(255, 69, 58, 0.1);
      padding: 2px 6px;
      border-radius: 6px;
    }

    .budget-roi-card {
      padding: 24px;
    }

    .budget-columns {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    }

    @media (max-width: 768px) {
      .budget-columns {
        flex-direction: column;
      }
    }

    .budget-input-row {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 0.5px solid rgba(0,0,0,0.05);
      padding-bottom: 12px;
    }

    .budget-input-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .input-symbol {
      position: relative;
      display: inline-block;
      width: 140px;
    }

    .currency {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 13px;
      color: var(--color-muted);
      font-weight: 600;
    }

    .inline-input {
      padding-left: 28px !important;
      font-size: 13px;
      font-weight: 600;
      width: 100%;
    }

    .roi-metric-preview {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 120px;
    }

    .roi-percentage {
      font-size: 11px;
      font-weight: 700;
    }
  `]
})
export class RoadHealthComponent implements OnInit, AfterViewInit, OnDestroy {
  cityHealthScore = 78;
  trendPeriod = 30;
  calculating = false;
  showForm = false;

  // Load States
  loading = true;
  error = false;

  newRoad = {
    roadName: '',
    minLat: 22.30,
    maxLat: 22.32,
    minLng: 73.17,
    maxLng: 73.19
  };

  zones = [
    { name: 'Zone A', score: 85, budget: 150000, spent: 110000, roi: 1.4 },
    { name: 'Zone B', score: 62, budget: 200000, spent: 165000, roi: 0.9 },
    { name: 'Zone C', score: 71, budget: 180000, spent: 142000, roi: 1.1 },
    { name: 'Zone D', score: 48, budget: 250000, spent: 215000, roi: 0.6 }
  ];

  priorityList: any[] = [];
  
  private trendChart!: Chart;
  private budgetChart!: Chart;
  private zonesData: any[] = [];

  constructor(
    private apiService: ApiService,
    private zoneService: ZoneService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.zoneService.getZones().subscribe({
      next: (data) => {
        this.zonesData = data;
        this.loadData();
      },
      error: () => {
        this.loadData();
      }
    });
  }

  ngAfterViewInit() {
    // Moved chart initialization to loadData success boundary to avoid canvas absence in DOM
  }

  ngOnDestroy() {
    if (this.trendChart) this.trendChart.destroy();
    if (this.budgetChart) this.budgetChart.destroy();
  }

  loadData() {
    this.loading = true;
    this.error = false;
    let completedCount = 0;

    const checkComplete = () => {
      completedCount++;
      if (completedCount === 2) {
        this.loading = false;
        if (!this.error) {
          setTimeout(() => {
            this.initTrendChart();
            this.initBudgetChart();
          }, 0);
        }
      }
    };

    // 1. Fetch Priority Lists
    this.apiService.getRoadPriority().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.priorityList = res.data.slice(0, 10).map((r: any) => ({
            roadName: r.roadName,
            healthScore: r.healthScore,
            totalPotholes: r.totalPotholes,
            complaintCount: r.complaintCount,
            priorityScore: r.priorityScore,
            zone: r.centerCoordinates ? this.detectZoneName(r.centerCoordinates[1], r.centerCoordinates[0]) : 'Zone A'
          }));
        }
        checkComplete();
      },
      error: () => {
        this.error = true;
        this.toast.error('Failed to fetch road health records');
        checkComplete();
      }
    });

    // 2. Fetch all road health scores to get city average
    this.apiService.getRoadHealth().subscribe({
      next: res => {
        if (res.success && res.data && res.data.length > 0) {
          const sum = res.data.reduce((acc: number, cur: any) => acc + cur.healthScore, 0);
          this.cityHealthScore = Math.round(sum / res.data.length);
          
          // Calculate average health scores per zone
          const zoneScoresMap: { [key: string]: { sum: number; count: number } } = {};
          res.data.forEach((r: any) => {
            const lat = r.centerCoordinates ? r.centerCoordinates[1] : 22.3072;
            const lng = r.centerCoordinates ? r.centerCoordinates[0] : 73.1812;
            const zoneName = this.detectZoneName(lat, lng);
            if (!zoneScoresMap[zoneName]) {
              zoneScoresMap[zoneName] = { sum: 0, count: 0 };
            }
            zoneScoresMap[zoneName].sum += r.healthScore;
            zoneScoresMap[zoneName].count++;
          });

          this.zones.forEach(z => {
            if (zoneScoresMap[z.name]) {
              z.score = Math.round(zoneScoresMap[z.name].sum / zoneScoresMap[z.name].count);
            }
          });
          
          this.recalculateRoi();
        }
        checkComplete();
      },
      error: () => {
        this.error = true;
        checkComplete();
      }
    });
  }

  private detectZoneName(lat: number, lng: number): string {
    for (const z of this.zonesData) {
      if (z.boundary && this.pointInPolygon(lat, lng, z.boundary)) {
        return z.name;
      }
    }
    // Fallback simple quadrant checks
    const centerLat = 22.3072;
    const centerLng = 73.1812;
    if (lat >= centerLat && lng < centerLng) return 'Zone A';
    else if (lat >= centerLat && lng >= centerLng) return 'Zone B';
    else if (lat < centerLat && lng < centerLng) return 'Zone C';
    return 'Zone D';
  }

  private pointInPolygon(lat: number, lng: number, polygon: any): boolean {
    if (!polygon || !polygon.coordinates || !polygon.coordinates[0]) return false;
    const coords = polygon.coordinates[0];
    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const xi = coords[i][1]; // lat
      const yi = coords[i][0]; // lng
      const xj = coords[j][1]; // lat
      const yj = coords[j][0]; // lng
      const intersect = ((yi > lng) !== (yj > lng)) &&
        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  recalculateScores() {
    this.calculating = true;
    this.toast.info('Recalculating road health scores...');
    this.apiService.calculateRoadHealth().subscribe({
      next: () => {
        this.calculating = false;
        this.toast.success('Road health recalculated successfully');
        this.loadData();
      },
      error: () => {
        this.calculating = false;
        this.toast.error('Calculation failed — please retry');
      }
    });
  }

  toggleNewRoadForm() {
    this.showForm = !this.showForm;
  }

  submitNewRoad() {
    if (!this.newRoad.roadName || !this.newRoad.minLat || !this.newRoad.maxLat || !this.newRoad.minLng || !this.newRoad.maxLng) {
      this.toast.warning('Please enter valid coordinates');
      return;
    }
    const payload = {
      roadName: this.newRoad.roadName,
      boundingBox: {
        minLat: this.newRoad.minLat,
        maxLat: this.newRoad.maxLat,
        minLng: this.newRoad.minLng,
        maxLng: this.newRoad.maxLng
      }
    };

    this.apiService.createRoad(payload.roadName, payload.boundingBox).subscribe({
      next: () => {
        this.toast.success('Road zone registered successfully');
        this.showForm = false;
        this.newRoad.roadName = '';
        this.loadData();
      },
      error: () => {
        this.toast.error('Failed to define road zone');
      }
    });
  }

  setTrendPeriod(p: number) {
    this.trendPeriod = p;
    this.updateTrendChart();
  }

  private initTrendChart() {
    const ctx = document.getElementById('healthTrendChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30'],
        datasets: [{
          label: 'Vadodara Health Index',
          data: [82, 80, 78, 79, 78, 77, 78],
          borderColor: 'var(--color-primary)',
          backgroundColor: 'rgba(0, 122, 255, 0.05)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 30, max: 100 }
        }
      }
    });
  }

  private updateTrendChart() {
    if (!this.trendChart) return;
    
    // Simulate prediction slope
    const labels = [];
    const data = [];
    let startScore = this.cityHealthScore;
    
    for (let i = 0; i <= this.trendPeriod; i += Math.ceil(this.trendPeriod / 7)) {
      labels.push(`Day ${i}`);
      // Declining trend modeling
      const predicted = Math.max(30, Math.round(startScore - (i * 0.12)));
      data.push(predicted);
    }

    this.trendChart.data.labels = labels;
    this.trendChart.data.datasets[0].data = data;
    this.trendChart.update();
  }

  private initBudgetChart() {
    const ctx = document.getElementById('budgetRoiChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.budgetChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Zone A', 'Zone B', 'Zone C', 'Zone D'],
        datasets: [
          {
            label: 'Budget Allocated (₹)',
            data: [150000, 200000, 180000, 250000],
            backgroundColor: 'rgba(0, 122, 255, 0.15)',
            borderColor: 'var(--color-primary)',
            borderWidth: 1
          },
          {
            label: 'Budget Spent (₹)',
            data: [110000, 165000, 142000, 215000],
            backgroundColor: 'rgba(48, 209, 88, 0.25)',
            borderColor: 'var(--color-success)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  recalculateRoi() {
    this.zones.forEach(z => {
      // Spent ROI logic: ΔHealth increase per ₹ spent.
      // Mock calculation: (100 - score) of degradation avoided divided by spent budget scale factor.
      const deltaHealth = (100 - z.score) * 1.5;
      z.roi = z.spent > 0 ? (deltaHealth / z.spent) * 10000 : 0;
    });

    if (this.budgetChart) {
      this.budgetChart.data.datasets[0].data = this.zones.map(z => z.budget);
      this.budgetChart.data.datasets[1].data = this.zones.map(z => z.spent);
      this.budgetChart.update();
    }
  }

  exportRoiCSV() {
    const headers = ['Zone Name', 'Zone Health Score', 'Budget Allocated', 'Budget Spent', 'Repair ROI (ΔHealth/₹10k Spent)'];
    const rows = this.zones.map(z => [
      z.name,
      `${z.score} RHI`,
      `₹${z.budget.toLocaleString()}`,
      `₹${z.spent.toLocaleString()}`,
      z.roi.toFixed(2)
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Vadodara_Road_Health_ROI_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.success('CSV downloaded');
  }
}
