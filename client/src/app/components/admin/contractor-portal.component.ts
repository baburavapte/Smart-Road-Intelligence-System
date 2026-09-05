import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { CameraCaptureComponent } from '../shared/camera-capture.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { SlaCountdownComponent } from '../shared/sla-countdown.component';
import { environment } from '../../../environments/environment';
import { SkeletonComponent } from '../shared/skeleton.component';
import { ErrorCardComponent } from '../shared/error-card.component';
import { ToastService } from '../../services/toast.service';
import * as L from 'leaflet';

interface Contractor {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  activeJobs: number;
  completedJobs: number;
  onTimeRate: number;
}

@Component({
  selector: 'app-contractor-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, CameraCaptureComponent, StatusBadgeComponent, SlaCountdownComponent, SkeletonComponent, ErrorCardComponent],
  template: `
    <div class="page-container">
      <div class="container flex-page">
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">Contractor Workspace</h1>
            <p class="page-header-subtitle">Assign work orders, track contractor crews, and audit repair proofs.</p>
          </div>
        </header>

        <div class="contractor-layout animate-fade-in-up">
          <!-- Left: Contractor List -->
          <aside class="contractor-sidebar flex-col">
            <h3 class="card-title">Crews & Contractors</h3>

            <!-- Skeleton loader for list -->
            <div *ngIf="loading" style="width: 100%;">
              <app-skeleton type="row" *ngFor="let i of [1,2,3]"></app-skeleton>
            </div>

            <!-- Error state -->
            <div *ngIf="error" style="width: 100%;">
              <app-error-card [title]="'Failed to load contractors'" (retry)="loadContractors()"></app-error-card>
            </div>

            <!-- Contractor List -->
            <div class="contractor-list" *ngIf="!loading && !error">
              <div class="contractor-card glass-card" 
                   *ngFor="let c of contractors" 
                   [class.active]="selectedContractor?.id === c.id"
                   (click)="selectContractor(c)">
                <div class="c-avatar">{{ c.name.substring(0, 2).toUpperCase() }}</div>
                <div class="c-info">
                  <h4>{{ c.name }}</h4>
                  <span class="c-spec">{{ c.specialization }}</span>
                  <div class="c-rating-row">
                    <span class="rating"><i class="ti ti-star-filled"></i> {{ c.rating }}</span>
                    <span class="jobs-lbl">{{ c.activeJobs }} active jobs</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <!-- Right: Details panel -->
          <main class="contractor-main flex-col" *ngIf="selectedContractor">
            <!-- Summary stats & Performance Metrics -->
            <div class="contractor-performance glass-card">
              <div class="perf-title-row">
                <h2>{{ selectedContractor.name }}</h2>
                <span class="status-badge status-none">{{ selectedContractor.specialization }}</span>
              </div>

              <!-- Performance metrics loader -->
              <div *ngIf="performanceLoading" class="meta text-center" style="padding: 12px;">
                Loading performance metrics...
              </div>

              <!-- Performance metrics grid -->
              <div class="perf-grid" *ngIf="!performanceLoading && performance">
                <div class="perf-metric">
                  <span class="card-label">On-Time Rate</span>
                  <span class="perf-val text-success">{{ performance.onTimeRate }}%</span>
                </div>
                <div class="perf-metric">
                  <span class="card-label">Avg Resolution</span>
                  <span class="perf-val">{{ performance.avgResolutionDays }} days</span>
                </div>
                <div class="perf-metric">
                  <span class="card-label">Overdue Jobs</span>
                  <span class="perf-val" [class.text-danger]="performance.overdue > 0">{{ performance.overdue }}</span>
                </div>
                <div class="perf-metric">
                  <span class="card-label">Completed / Total</span>
                  <span class="perf-val">{{ performance.completed }} / {{ performance.totalAssigned }}</span>
                </div>
              </div>
            </div>

            <!-- Leaflet Job Pins Map -->
            <div class="glass-card map-panel" style="height: 200px; padding:0; overflow:hidden;">
              <div #mapContainer style="width: 100%; height: 100%;"></div>
            </div>

            <!-- Assigned Jobs List -->
            <div class="glass-card assignments-panel flex-col">
              <h3 class="card-title">Assigned repairs</h3>
              <div class="jobs-list" *ngIf="jobs.length > 0">
                <div class="job-item glass-card" *ngFor="let job of jobs">
                  <div class="job-row">
                    <div class="job-meta">
                      <h4>{{ job.detection?.originalFilename || 'distressed Road Segment' }}</h4>
                      <div class="job-badges">
                        <app-status-badge [status]="job.detection?.severity" type="severity"></app-status-badge>
                        <app-status-badge [status]="job.reportLifecycle" type="lifecycle"></app-status-badge>
                        <app-sla-countdown [createdAt]="job.createdAt" [severity]="job.detection?.severity"></app-sla-countdown>
                      </div>
                    </div>
                    
                    <div class="job-actions">
                      <button class="btn-secondary btn-sm" 
                              *ngIf="job.reportLifecycle === 'assigned'"
                              (click)="markInProgress(job.id)">
                        Start Work
                      </button>
                      
                      <button class="btn-primary btn-sm" 
                              *ngIf="job.reportLifecycle === 'in_progress'"
                              (click)="openCompleteModal(job.id)">
                        Submit Proof
                      </button>
                    </div>
                  </div>

                  <!-- Complete repair modal inline -->
                  <div class="repair-complete-form animate-fade-in" *ngIf="activeJobIdForProof === job.id">
                    <h4 class="card-label" style="margin-bottom: 12px; color: var(--color-primary);">Submit Repair Proof</h4>
                    
                    <div class="form-group" style="margin-bottom: 12px;">
                      <label class="card-label">After Image (Repair Proof)</label>
                      <app-camera-capture (imageSelected)="onProofImageSelected($event)"></app-camera-capture>
                    </div>

                    <div class="form-group" style="margin-bottom: 12px;">
                      <label class="card-label">Repair Notes</label>
                      <textarea [(ngModel)]="repairNotes" placeholder="Describe the pavement patch detail..." class="glass-input form-textarea"></textarea>
                    </div>

                    <div class="modal-actions">
                      <button class="btn-primary btn-sm" (click)="submitProof(job.id)" [disabled]="!proofFile || submittingProof">
                        {{ submittingProof ? 'Uploading...' : 'Verify Complete' }}
                      </button>
                      <button class="btn-secondary btn-sm" (click)="activeJobIdForProof = null">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
              <p class="meta text-center" *ngIf="jobs.length === 0">No active work orders found.</p>
            </div>
          </main>

          <!-- Select state -->
          <main class="contractor-main glass-card flex-col align-center justify-center text-center" style="padding:40px;" *ngIf="!selectedContractor">
            <i class="ti ti-users" style="font-size: 48px; color: var(--color-muted);"></i>
            <h3>Select a Contractor</h3>
            <p class="meta">Select a contractor crew from the sidebar to inspect their workload and locations.</p>
          </main>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .flex-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 80px;
    }

    .contractor-layout {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 900px) {
      .contractor-layout {
        grid-template-columns: 1fr;
      }
    }

    .contractor-sidebar {
      padding: 16px;
    }

    .contractor-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .contractor-card {
      padding: 12px;
      display: flex;
      gap: 12px;
      align-items: center;
      cursor: pointer;
      transition: var(--transition);
      border-left: 3px solid transparent;
    }

    .contractor-card:hover {
      transform: translateX(2px);
    }

    .contractor-card.active {
      background: rgba(0, 122, 255, 0.05);
      border-left-color: var(--color-primary);
    }

    .c-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(0, 122, 255, 0.1);
      color: var(--color-primary);
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }

    .c-info {
      flex: 1;
    }

    .c-info h4 {
      font-size: 13px;
      font-weight: 600;
      margin: 0;
    }

    .c-spec {
      font-size: 11px;
      color: var(--color-muted);
    }

    .c-rating-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      margin-top: 4px;
    }

    .rating {
      color: #ff9f0a;
    }

    .jobs-lbl {
      color: var(--color-muted);
    }

    .perf-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .perf-metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px;
      background: rgba(0,0,0,0.02);
      border-radius: 12px;
    }

    .perf-val {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 700;
    }

    .skeleton-card {
      height: 68px;
      border-radius: 12px;
      background: linear-gradient(90deg, rgba(0,0,0,0.03) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.03) 75%);
      background-size: 200% 100%;
      animation: pulseGlow 1.5s infinite;
      margin-bottom: 12px;
    }

    @keyframes pulseGlow {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (max-width: 768px) {
      .contractor-sidebar {
        padding: 12px;
      }

      .contractor-card {
        padding: 10px;
        gap: 10px;
      }
    }

    @media (max-width: 480px) {
      .contractor-layout {
        gap: 16px;
      }
    }
  `]
})
export class ContractorPortalComponent implements OnInit, AfterViewInit {
  contractors: Contractor[] = [];
  selectedContractor: Contractor | null = null;
  jobs: any[] = [];
  loading = true;
  error = false;
  performance: any = null;
  performanceLoading = false;

  activeJobIdForProof: string | null = null;
  proofFile: File | null = null;
  repairNotes = '';
  submittingProof = false;

  private map!: L.Map;
  private markersGroup = L.layerGroup();

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  constructor(
    private apiService: ApiService,
    private http: HttpClient,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadContractors();
  }

  ngAfterViewInit() {
    // Delay initialization until map element exists
  }

  loadContractors() {
    this.loading = true;
    this.error = false;
    this.http.get<{ success: boolean; data: Contractor[] }>(`${environment.apiUrl}/contractors`).subscribe({
      next: (res) => {
        this.contractors = res.data;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  selectContractor(c: Contractor) {
    this.selectedContractor = c;
    this.activeJobIdForProof = null;
    this.proofFile = null;
    this.repairNotes = '';
    
    this.loadJobsForContractor(c.name);
    this.loadContractorPerformance(c.id);
  }

  private loadJobsForContractor(name: string) {
    this.apiService.getCitizenReports(undefined, undefined, 1, 50).subscribe(res => {
      if (res.success && res.data) {
        this.jobs = res.data.filter((j: any) => j.assignedTeam === name).map((j: any) => ({
          id: j.id,
          reportLifecycle: j.reportLifecycle,
          createdAt: j.createdAt,
          detection: j.detection ? {
            originalFilename: j.detection.originalFilename,
            severity: j.detection.severity,
            location: j.detection.location
          } : null
        }));
        this.updateMapPins();
      }
    });
  }

  loadContractorPerformance(id: string) {
    this.performanceLoading = true;
    this.http.get<any>(`${environment.apiUrl}/contractors/${id}/performance`).subscribe({
      next: (res) => {
        this.performance = res;
        this.performanceLoading = false;
      },
      error: () => {
        this.performanceLoading = false;
      }
    });
  }

  private initMap() {
    if (!this.mapContainer) return;
    
    // Destroy previous
    if (this.map) {
      this.map.remove();
    }

    const center = L.latLng(22.3072, 73.1812);
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false,
      attributionControl: false
    }).setView(center, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20
    }).addTo(this.map);

    this.markersGroup.addTo(this.map);
  }

  private updateMapPins() {
    // Set map init delay to wait for container render
    setTimeout(() => {
      this.initMap();
      if (!this.map) return;

      this.markersGroup.clearLayers();
      const points: L.LatLng[] = [];

      this.jobs.forEach(job => {
        const coords = job.detection?.location?.coordinates || [73.1812, 22.3072]; // [lng, lat]
        const latLng = L.latLng(coords[1], coords[0]);
        
        const sev = job.detection?.severity || 'low';
        const color = sev === 'critical' ? '#FF453A' : (sev === 'moderate' || sev === 'medium' || sev === 'high' ? '#FFD60A' : '#30D158');

        const marker = L.circleMarker(latLng, {
          radius: 8,
          fillColor: color,
          color: '#FFFFFF',
          weight: 2,
          fillOpacity: 0.9,
          className: sev === 'critical' ? 'critical-pulse-marker' : ''
        });

        marker.bindPopup(`
          <div style="font-size:12px; font-family:'Outfit', sans-serif; padding: 6px;">
            <strong>${job.detection?.originalFilename ? job.detection.originalFilename.split('.')[0] : 'distressed location'}</strong>
            <div style="display:flex; gap:4px; align-items:center; margin-top:4px;">
              <span style="font-size:9px; padding:1px 6px; border-radius:6px; background:rgba(0,0,0,0.05); color:#6E6E73; text-transform:uppercase;">${sev}</span>
              <span style="font-size:9px; padding:1px 6px; border-radius:6px; background:rgba(0,122,255,0.1); color:#007AFF;">${job.reportLifecycle}</span>
            </div>
          </div>
        `);

        this.markersGroup.addLayer(marker);
        points.push(latLng);
      });

      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        this.map.fitBounds(bounds, { padding: [30, 30] });
      }
    }, 100);
  }

  markInProgress(id: string) {
    if (!this.selectedContractor) return;
    this.http.put(`${environment.apiUrl}/contractors/${this.selectedContractor.id}/status`, {
      repairId: id,
      status: 'in_progress',
      notes: 'Started work order.'
    }).subscribe({
      next: () => {
        this.loadJobsForContractor(this.selectedContractor!.name);
        this.loadContractorPerformance(this.selectedContractor!.id);
      }
    });
  }

  openCompleteModal(id: string) {
    this.activeJobIdForProof = id;
    this.proofFile = null;
    this.repairNotes = '';
  }

  onProofImageSelected(event: { file: File; previewUrl: string }) {
    this.proofFile = event.file;
  }

  submitProof(id: string) {
    if (!this.proofFile || !this.selectedContractor) return;

    this.submittingProof = true;
    const formData = new FormData();
    formData.append('afterImage', this.proofFile);
    formData.append('citizenReportId', id);
    formData.append('repairNotes', this.repairNotes);
    formData.append('repairTeam', this.selectedContractor.name);

    this.apiService.submitRepairProof(formData).subscribe({
      next: () => {
        this.http.put(`${environment.apiUrl}/contractors/${this.selectedContractor!.id}/status`, {
          repairId: id,
          status: 'complete',
          notes: this.repairNotes
        }).subscribe({
          next: () => {
            this.submittingProof = false;
            this.activeJobIdForProof = null;
            this.toast.success('Repair verified and status updated successfully!');
            this.loadJobsForContractor(this.selectedContractor!.name);
            this.loadContractorPerformance(this.selectedContractor!.id);
          },
          error: () => {
            this.submittingProof = false;
            this.toast.error('Failed to update status.');
          }
        });
      },
      error: () => {
        this.submittingProof = false;
        this.toast.error('Upload proof failed.');
      }
    });
  }
}
