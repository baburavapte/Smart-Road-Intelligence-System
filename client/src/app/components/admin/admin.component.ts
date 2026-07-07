import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface AdminDetection {
    id: string;
    fileId: string;
    originalImage: string;
    annotatedImage: string;
    originalFilename: string;
    potholeCount: number;
    severity: string;
    reportStatus: string;
    location: any;
    createdAt: string;
}

interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error';
}

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
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
            <button class="btn-secondary" type="button" aria-label="View Today's metrics">
              <i class="ti ti-calendar" aria-hidden="true"></i> Today
            </button>
            <button class="btn-secondary" type="button" aria-label="Open filter settings">
              <i class="ti ti-filter" aria-hidden="true"></i> Filter
            </button>
            <a routerLink="/detect" class="btn-primary" aria-label="Submit new pothole report">
              <i class="ti ti-plus" aria-hidden="true"></i> New Report
            </a>
          </div>
        </header>

        <!-- Error Banner -->
        <div class="error-banner glass-card animate-fade-in-up" *ngIf="error">
          <div class="error-content">
            <span class="error-icon" aria-hidden="true">⚠️</span>
            <span class="error-text">{{ error }}</span>
          </div>
          <button class="btn-primary" (click)="retryLoad()">Retry</button>
        </div>

        <!-- 5 KPI Cards Row -->
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
              <span class="kpi-value">{{ stats.criticalPotholes + stats.pendingReports }}</span>
              <span class="kpi-badge badge-danger">+23 today</span>
            </div>
          </div>
          <div class="kpi-card glass-card accent-resolved">
            <span class="kpi-title">Resolved</span>
            <div class="kpi-value-row">
              <span class="kpi-value">{{ stats.fixedReports }}</span>
              <span class="kpi-badge badge-success">89% rate</span>
            </div>
          </div>
          <div class="kpi-card glass-card accent-pending">
            <span class="kpi-title">Pending Review</span>
            <div class="kpi-value-row">
              <span class="kpi-value">{{ stats.pendingReports }}</span>
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

        <!-- Main Dashboard Column Grid Layout -->
        <div class="dashboard-columns-grid animate-fade-in-up">
          <!-- Left Column: Command Tab Contents (~72% width on desktop) -->
          <main class="dashboard-main-column">
            <!-- Command Tabs Navigation Panel -->
            <nav class="admin-tabs glass-card" aria-label="Dashboard views">
              <button class="tab-btn" [class.active]="activeTab === 'detections'" (click)="setTab('detections')">
                <i class="ti ti-camera" aria-hidden="true"></i> AI Detections
              </button>
              <button class="tab-btn" [class.active]="activeTab === 'citizenReports'" (click)="setTab('citizenReports')">
                <i class="ti ti-clipboard-list" aria-hidden="true"></i> Gov Reports Lifecycle
              </button>
              <button class="tab-btn" [class.active]="activeTab === 'priorityRoads'" (click)="setTab('priorityRoads')">
                <i class="ti ti-alert-triangle" aria-hidden="true"></i> Repair Priority Engine
              </button>
            </nav>

            <!-- TAB 1: AI Detections -->
            <div *ngIf="activeTab === 'detections'" class="tab-content-wrapper">
              <!-- Filter Bar Container -->
              <div class="filter-bar glass-card">
                <div class="filter-row">
                  <div class="filter-select-wrapper">
                    <select [(ngModel)]="filters.status" class="filter-select" aria-label="Filter by Status">
                      <option value="">All Status</option>
                      <option value="reported">Reported</option>
                      <option value="under_review">Under Review</option>
                      <option value="in_progress">In Progress</option>
                      <option value="fixed">Fixed</option>
                    </select>
                    <span class="select-arrow" aria-hidden="true">▾</span>
                  </div>

                  <div class="filter-select-wrapper">
                    <select [(ngModel)]="filters.severity" class="filter-select" aria-label="Filter by Severity">
                      <option value="">All Severity</option>
                      <option value="none">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <span class="select-arrow" aria-hidden="true">▾</span>
                  </div>

                  <input
                    type="date"
                    [(ngModel)]="filters.dateFrom"
                    class="filter-input"
                    placeholder="From Date"
                    aria-label="From Date"
                  />

                  <input
                    type="date"
                    [(ngModel)]="filters.dateTo"
                    class="filter-input"
                    placeholder="To Date"
                    aria-label="To Date"
                  />

                  <button class="btn-primary" (click)="applyFilters()">Apply</button>
                  <button class="btn-secondary" (click)="clearFilters()">Clear</button>
                </div>
              </div>

              <!-- Reports Table Card -->
              <div class="table-card glass-card">
                <!-- Loading Skeleton Table -->
                <div *ngIf="loadingTable" class="table-skeleton">
                  <div class="skeleton-row skeleton-header">
                    <div class="skeleton" style="width: 30px; height: 14px;"></div>
                    <div class="skeleton" style="width: 48px; height: 14px;"></div>
                    <div class="skeleton" style="width: 120px; height: 14px;"></div>
                    <div class="skeleton" style="width: 60px; height: 14px;"></div>
                    <div class="skeleton" style="width: 70px; height: 14px;"></div>
                    <div class="skeleton" style="width: 100px; height: 14px;"></div>
                    <div class="skeleton" style="width: 80px; height: 14px;"></div>
                  </div>
                  <div class="skeleton-row" *ngFor="let i of [1,2,3,4,5]">
                    <div class="skeleton" style="width: 24px; height: 16px;"></div>
                    <div class="skeleton" style="width: 44px; height: 44px; border-radius: 8px;"></div>
                    <div class="skeleton" style="width: 140px; height: 16px;"></div>
                    <div class="skeleton" style="width: 30px; height: 16px;"></div>
                    <div class="skeleton" style="width: 60px; height: 22px; border-radius: 12px;"></div>
                    <div class="skeleton" style="width: 110px; height: 30px; border-radius: 6px;"></div>
                    <div class="skeleton" style="width: 80px; height: 16px;"></div>
                  </div>
                </div>

                <!-- Empty State -->
                <div *ngIf="!loadingTable && detections.length === 0 && !error" class="empty-state">
                  <div class="empty-icon" aria-hidden="true">📋</div>
                  <h3>No Reports Found</h3>
                  <p>No pothole reports match your current filters. Try adjusting the filter criteria.</p>
                  <button class="btn-secondary" style="margin-top: 16px;" (click)="clearFilters()">Clear All Filters</button>
                </div>

                <!-- Actual Data Table -->
                <div class="table-wrapper" *ngIf="!loadingTable && detections.length > 0">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Preview</th>
                        <th>Filename</th>
                        <th>Count</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let det of detections; let i = index">
                        <td class="cell-index">{{ (currentPage - 1) * limit + i + 1 }}</td>
                        <td>
                          <div class="img-thumb-container">
                            <img
                              [src]="det.annotatedImage || det.originalImage"
                              alt="Annotated road visual"
                              class="thumb-img"
                              (error)="onImageError($event)"
                            />
                          </div>
                        </td>
                        <td class="cell-filename" [title]="det.originalFilename">
                          {{ truncateFilename(det.originalFilename) }}
                        </td>
                        <td class="cell-count">
                          <span class="pothole-count">{{ det.potholeCount }}</span>
                        </td>
                        <td>
                          <span class="severity-badge" [ngClass]="'severity-' + (det.severity || 'none')">
                            {{ det.severity || 'none' }}
                          </span>
                        </td>
                        <td>
                          <div class="status-select-wrapper">
                            <select
                              class="status-select"
                              [ngClass]="'status-' + (det.reportStatus || 'reported')"
                              [(ngModel)]="det.reportStatus"
                              (ngModelChange)="onStatusChange(det)"
                              aria-label="Set lifecycle status"
                            >
                              <option value="reported">Reported</option>
                              <option value="under_review">Under Review</option>
                              <option value="in_progress">In Progress</option>
                              <option value="fixed">Fixed</option>
                            </select>
                            <span class="select-arrow-inline" aria-hidden="true">▾</span>
                          </div>
                        </td>
                        <td>
                          <div class="action-buttons-cell">
                            <a [routerLink]="['/results', det.id]" class="action-view">View</a>
                            <button class="action-delete" (click)="deleteReport(det)">Delete</button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Pagination controls -->
                <div class="pagination-bar" *ngIf="!loadingTable && detections.length > 0">
                  <div class="pagination-info">
                    {{ paginationStart }}–{{ paginationEnd }} of {{ totalItems }} reports
                  </div>
                  <div class="pagination-controls">
                    <button
                      class="page-btn"
                      [disabled]="currentPage === 1"
                      (click)="goToPage(currentPage - 1)"
                    >
                      ← Prev
                    </button>

                    <ng-container *ngFor="let p of pageNumbers">
                      <button
                        class="page-btn"
                        [class.page-active]="p === currentPage"
                        (click)="goToPage(p)"
                      >
                        {{ p }}
                      </button>
                    </ng-container>

                    <button
                      class="page-btn"
                      [disabled]="currentPage === totalPages"
                      (click)="goToPage(currentPage + 1)"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 2: Gov Reports Lifecycle -->
            <div *ngIf="activeTab === 'citizenReports'" class="tab-content-wrapper">
              <div class="table-card glass-card">
                <div class="table-card-header">
                  <h3 class="section-title-alt">Citizen-submitted Reports</h3>
                  <p class="section-subtitle-alt">Track and manage complaints through repair milestones</p>
                </div>

                <!-- Loading Spinner -->
                <div class="loading-state" *ngIf="loadingCitizenReports">
                  <span class="spinner" aria-hidden="true"></span>
                  <p>Loading citizen reports...</p>
                </div>

                <!-- Empty State -->
                <div class="empty-state" *ngIf="!loadingCitizenReports && citizenReports.length === 0">
                  <div class="empty-icon" aria-hidden="true">📋</div>
                  <h3>No Citizen Reports Found</h3>
                  <p>No reports have been submitted by citizens yet.</p>
                </div>

                <!-- Table Content -->
                <div class="table-wrapper" *ngIf="!loadingCitizenReports && citizenReports.length > 0">
                  <table class="admin-table dense-table">
                    <thead>
                      <tr>
                        <th>Reporter</th>
                        <th>Email</th>
                        <th>Description</th>
                        <th>Metrics</th>
                        <th>Lifecycle Stage</th>
                        <th>Work Management Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let rep of citizenReports">
                        <td style="font-weight:600; color:var(--text-primary);">{{ rep.reporterName || 'Anonymous' }}</td>
                        <td style="color:var(--text-secondary); font-size:12px;">{{ rep.reporterEmail || '—' }}</td>
                        <td [title]="rep.description" class="cell-desc-wrap">
                          {{ rep.description || '—' }}
                        </td>
                        <td>
                          <div class="metrics-cell-badge">
                            <span class="pothole-count-badge">{{ rep.detection?.potholeCount || 0 }} potholes</span>
                            <span class="severity-badge-mini" [ngClass]="'severity-' + (rep.detection?.severity || 'none')">
                              {{ rep.detection?.severity || 'none' }}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span class="category-badge" [ngClass]="'badge-' + getFriendlyBadgeClass(rep.reportLifecycle)">
                            {{ getLifecycleDisplay(rep.reportLifecycle) }}
                          </span>
                        </td>
                        <td>
                          <div class="workflow-actions-grid">
                            <!-- Transition reported -> verified -->
                            <button class="btn-primary btn-sm" *ngIf="rep.reportLifecycle === 'reported'" (click)="updateLifecycle(rep.id, 'verified')">
                              🔍 Verify Report
                            </button>

                            <!-- Transition verified -> assigned -->
                            <div class="assign-team-box" *ngIf="rep.reportLifecycle === 'verified'">
                              <input type="text" [(ngModel)]="assignedTeamInputs[rep.id]" placeholder="Crew Name" class="form-input text-box-sm" aria-label="Enter crew name to assign">
                              <button class="btn-primary btn-sm" (click)="assignTeam(rep.id)">
                                👥 Assign
                              </button>
                            </div>

                            <!-- Transition assigned -> in_progress -->
                            <button class="btn-primary btn-sm btn-indigo" *ngIf="rep.reportLifecycle === 'assigned'" (click)="updateLifecycle(rep.id, 'in_progress')">
                              🛠️ Start Repair
                            </button>

                            <!-- Transition in_progress -> fixed (proof upload upload) -->
                            <button class="btn-primary btn-sm btn-teal" *ngIf="rep.reportLifecycle === 'in_progress' && uploadingRepairId !== rep.id" (click)="startRepairProofUpload(rep)">
                              🛡️ Upload Proof (Fix)
                            </button>

                            <!-- Repair Proof Upload Form Row -->
                            <div class="repair-upload-inline glass-card animate-scale-in" *ngIf="uploadingRepairId === rep.id">
                              <div class="proof-header">
                                <h5>Upload Before &amp; After Proof</h5>
                                <button class="close-inline" (click)="cancelRepairProofUpload()" aria-label="Cancel upload">✕</button>
                              </div>
                              <div class="proof-form-grid">
                                <div class="form-group-proof">
                                  <label>After Repair Image *</label>
                                  <input type="file" (change)="onFileSelected($event, 'afterImage')" accept="image/*" class="file-control">
                                </div>
                                <div class="form-group-proof">
                                  <label>Before Repair Image (Optional)</label>
                                  <input type="file" (change)="onFileSelected($event, 'beforeImage')" accept="image/*" class="file-control">
                                </div>
                                <div class="form-group-proof full-width-proof">
                                  <input type="text" [(ngModel)]="repairForm.notes" placeholder="Notes (e.g., resurfaced Outer Ring Road)" class="glass-input">
                                </div>
                                <div class="form-group-proof full-width-proof">
                                  <input type="text" [(ngModel)]="repairForm.team" placeholder="Confirm Crew Name" class="glass-input">
                                </div>
                              </div>
                              <div class="proof-actions">
                                <button class="btn-primary btn-sm" (click)="submitRepairProof(rep.id)">Submit Proof</button>
                                <button class="btn-secondary btn-sm" (click)="cancelRepairProofUpload()">Cancel</button>
                              </div>
                            </div>

                            <!-- Fixed and Closed states -->
                            <span class="state-fixed-label" *ngIf="rep.reportLifecycle === 'fixed'">
                              <i class="ti ti-circle-check"></i> Repair Pending Verification
                            </span>
                            <span class="state-closed-label" *ngIf="rep.reportLifecycle === 'closed'">
                              📁 Closed
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- TAB 3: Top Priority Roads -->
            <div *ngIf="activeTab === 'priorityRoads'" class="tab-content-wrapper">
              <div class="table-card glass-card">
                <div class="table-card-header">
                  <h3 class="section-title-alt">Repair Priority Engine</h3>
                  <p class="section-subtitle-alt">Urgency rankings calculated via Multi-Criteria Decision Analysis (MCDA)</p>
                </div>
                
                <div class="priority-algo-info glass-card">
                  <i class="ti ti-info-circle" aria-hidden="true"></i>
                  <span>Urgency algorithm aggregates <strong>35% Severity Impact</strong> + <strong>25% Complaints Volume</strong> + <strong>25% Road Health (Inverse RHI)</strong> + <strong>15% Historical Degradation Frequency</strong>.</span>
                </div>

                <!-- Loading Spinner -->
                <div class="loading-state" *ngIf="loadingPriorityRoads">
                  <span class="spinner" aria-hidden="true"></span>
                  <p>Calculating priority indexes...</p>
                </div>

                <!-- Priority roads list table -->
                <div class="table-wrapper" *ngIf="!loadingPriorityRoads && priorityRoads.length > 0">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Road Segment</th>
                        <th>Health Score (RHI)</th>
                        <th>Complaints</th>
                        <th>Degradations (30d)</th>
                        <th>Urgency Index</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let road of priorityRoads; let idx = index">
                        <td class="cell-index">#{{ idx + 1 }}</td>
                        <td style="font-weight:600; color:var(--text-primary);">{{ road.roadName }}</td>
                        <td>
                          <div class="priority-score-rhi-cell">
                            <span class="score-num font-outfit" [ngClass]="'color-' + road.healthCategory">{{ road.healthScore }}</span>
                            <span class="category-badge" [ngClass]="'badge-' + road.healthCategory">{{ getCategoryLabel(road.healthCategory) }}</span>
                          </div>
                        </td>
                        <td class="complaints-text">{{ road.complaintCount }} complaints</td>
                        <td style="color:var(--text-secondary);">{{ road.historicalFrequency }} potholes</td>
                        <td>
                          <span class="priority-pill" [style.background]="getPriorityColor(road.priorityScore)">
                            {{ (road.priorityScore * 100).toFixed(0) }}% Urgency
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>

          <!-- Right Column: Command Widgets (~28% width on desktop) -->
          <aside class="dashboard-side-column">
            <!-- Widget 1: Budget Tracker (Liquid Glass panel) -->
            <div class="widget-card glass-card">
              <h4 class="widget-title">Budget Allocation</h4>
              <div class="circular-progress-section">
                <!-- SVG circular tracker -->
                <svg viewBox="0 0 100 100" class="circular-svg">
                  <circle cx="50" cy="50" r="40" class="svg-track"></circle>
                  <circle cx="50" cy="50" r="40" class="svg-fill fill-budget"></circle>
                  <text x="50" y="55" text-anchor="middle" class="svg-text">64%</text>
                </svg>
                <div class="widget-stats-info">
                  <span class="widget-stat-highlight">$2.4M <span class="widget-stat-unit">spent</span></span>
                  <span class="widget-stat-sub">of $3.8M municipal allotment</span>
                </div>
              </div>
            </div>

            <!-- Widget 2: Contractor Status -->
            <div class="widget-card glass-card">
              <h4 class="widget-title">Contractor Status</h4>
              <div class="contractor-list">
                <div class="contractor-item">
                  <div class="contractor-header-row">
                    <span class="contractor-name">L&T Infra Group</span>
                    <span class="badge-active-jobs">7 Jobs</span>
                  </div>
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill fill-green" style="width: 90%;"></div>
                  </div>
                  <div class="contractor-meta-row">
                    <span class="contractor-perf text-green">On Time</span>
                    <span class="contractor-rating">4.8 ★</span>
                  </div>
                </div>

                <div class="contractor-item">
                  <div class="contractor-header-row">
                    <span class="contractor-name">Maruti Builders</span>
                    <span class="badge-active-jobs">4 Jobs</span>
                  </div>
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill fill-yellow" style="width: 65%;"></div>
                  </div>
                  <div class="contractor-meta-row">
                    <span class="contractor-perf text-yellow">Slight Delay</span>
                    <span class="contractor-rating">4.2 ★</span>
                  </div>
                </div>

                <div class="contractor-item">
                  <div class="contractor-header-row">
                    <span class="contractor-name">Reliance Roads Ltd</span>
                    <span class="badge-active-jobs">12 Jobs</span>
                  </div>
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill fill-green" style="width: 82%;"></div>
                  </div>
                  <div class="contractor-meta-row">
                    <span class="contractor-perf text-green">On Time</span>
                    <span class="contractor-rating">4.6 ★</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Widget 3: Upcoming Maintenance -->
            <div class="widget-card glass-card">
              <h4 class="widget-title">Upcoming Maintenance</h4>
              <div class="maintenance-schedule-list">
                <div class="maintenance-item">
                  <div class="maint-icon-square bg-blue-tint">
                    <i class="ti ti-road"></i>
                  </div>
                  <div class="maint-details">
                    <span class="maint-road-name">Outer Ring Road</span>
                    <span class="maint-meta">Sector 5 · Scheduled 26 Jun</span>
                  </div>
                </div>

                <div class="maintenance-item">
                  <div class="maint-icon-square bg-purple-tint">
                    <i class="ti ti-alert-triangle"></i>
                  </div>
                  <div class="maint-details">
                    <span class="maint-road-name">Vasna Road Crossing</span>
                    <span class="maint-meta">Critical Patch · Scheduled 28 Jun</span>
                  </div>
                </div>

                <div class="maintenance-item">
                  <div class="maint-icon-square bg-cyan-tint">
                    <i class="ti ti-check"></i>
                  </div>
                  <div class="maint-details">
                    <span class="maint-road-name">Alkapuri Underpass</span>
                    <span class="maint-meta">Drainage Fix · Scheduled 01 Jul</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>

    <!-- Toast Notifications Center -->
    <div class="toast-container" role="status" aria-live="polite">
      <div
        *ngFor="let toast of toasts"
        class="toast glass-card"
        [ngClass]="'toast-' + toast.type"
      >
        <span class="toast-icon">{{ toast.type === 'success' ? '✓' : '✕' }}</span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </div>
  `,
    styles: [`
      /* Topbar and layout config */
      .page-container {
        padding: 40px 0 80px;
        background: transparent;
      }

      /* KPI card modifications */
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

      /* Accent bars for KPI cards */
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
        font-family: 'SF Pro Display', 'Inter', sans-serif;
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

      /* Columns Grid layout */
      .dashboard-columns-grid {
        display: grid;
        grid-template-columns: 2.5fr 1fr;
        gap: 24px;
        align-items: start;
      }

      .dashboard-main-column {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .dashboard-side-column {
        display: flex;
        flex-direction: column;
        gap: 20px;
        position: sticky;
        top: 20px;
      }

      /* Command tab styles */
      .admin-tabs {
        padding: 6px;
        display: flex;
        gap: 4px;
      }

      .tab-btn {
        background: transparent;
        border: none;
        border-radius: 14px;
        padding: 8px 16px;
        color: var(--text-secondary);
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: var(--transition);
      }

      .tab-btn:hover {
        background: rgba(0, 0, 0, 0.04);
        color: var(--text-primary);
      }

      .tab-btn.active {
        background: #fff;
        color: var(--primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        font-weight: 600;
      }

      .tab-btn i {
        font-size: 15px;
      }

      /* Filter bar styling */
      .filter-bar {
        padding: 14px 20px;
      }

      .filter-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .filter-select-wrapper {
        position: relative;
      }

      .filter-select {
        appearance: none;
        -webkit-appearance: none;
        padding-right: 32px;
        cursor: pointer;
      }

      .select-arrow {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary);
        font-size: 11px;
        pointer-events: none;
      }

      .filter-input {
        max-width: 150px;
      }

      /* Data Tables Styling */
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

      .admin-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }

      .admin-table th {
        padding: 12px 24px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-secondary);
        font-weight: 600;
        text-align: left;
        border-bottom: 0.5px solid var(--border-tint);
        background: rgba(0,0,0,0.01);
      }

      .admin-table td {
        padding: 14px 24px;
        vertical-align: middle;
        border-bottom: 0.5px solid var(--border-tint);
        color: var(--text-primary);
        font-size: 13.5px;
      }

      .admin-table tbody tr {
        transition: background 0.15s ease;
      }

      .admin-table tbody tr:hover {
        background: rgba(0, 122, 255, 0.015);
      }

      /* Image Thumbnails */
      .img-thumb-container {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        overflow: hidden;
        border: 0.5px solid rgba(0, 0, 0, 0.08);
      }

      .thumb-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .cell-index {
        font-size: 12px;
        color: var(--text-secondary);
        width: 40px;
        font-weight: 500;
      }

      .cell-filename {
        font-weight: 500;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pothole-count {
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        font-size: 15px;
      }

      .action-buttons-cell {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .action-view {
        color: var(--primary);
        font-weight: 500;
        text-decoration: none;
      }

      .action-view:hover {
        text-decoration: underline;
      }

      .action-delete {
        background: transparent;
        border: none;
        color: var(--danger);
        font-weight: 500;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
        padding: 0;
      }

      .action-delete:hover {
        text-decoration: underline;
      }

      /* Status select inside table */
      .status-select-wrapper {
        position: relative;
        display: inline-block;
      }

      .status-select {
        appearance: none;
        -webkit-appearance: none;
        background: #fff;
        border: 0.5px solid rgba(0,0,0,0.12);
        border-radius: 14px;
        padding: 4px 24px 4px 10px;
        font-family: inherit;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        outline: none;
        min-width: 115px;
      }

      .select-arrow-inline {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary);
        font-size: 10px;
        pointer-events: none;
      }

      .status-select.status-reported { color: #85858b; background: rgba(0,0,0,0.02); }
      .status-select.status-under_review { color: #b28900; background: rgba(255, 214, 10, 0.08); border-color: rgba(255, 214, 10, 0.2); }
      .status-select.status-in_progress { color: #0076f6; background: rgba(0, 122, 255, 0.08); border-color: rgba(0, 122, 255, 0.2); }
      .status-select.status-fixed { color: #248a3d; background: rgba(48, 209, 88, 0.08); border-color: rgba(48, 209, 88, 0.2); }

      /* Pagination styling */
      .pagination-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-top: 0.5px solid var(--border-tint);
      }

      .pagination-info {
        font-size: 12.5px;
        color: var(--text-secondary);
      }

      .pagination-controls {
        display: flex;
        gap: 6px;
      }

      .page-btn {
        background: #fff;
        border: 0.5px solid rgba(0,0,0,0.1);
        color: var(--text-primary);
        padding: 6px 12px;
        border-radius: 12px;
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 500;
        cursor: pointer;
        transition: var(--transition);
      }

      .page-btn:hover:not(:disabled):not(.page-active) {
        background: rgba(0,0,0,0.02);
      }

      .page-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .page-active {
        background: var(--primary);
        color: white;
        border-color: transparent;
        font-weight: 600;
      }

      /* Tab 2 Details */
      .dense-table th, .dense-table td {
        padding: 12px 16px;
      }

      .cell-desc-wrap {
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--text-secondary);
        font-size: 13px;
      }

      .metrics-cell-badge {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: flex-start;
      }

      .pothole-count-badge {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 12px;
      }

      .severity-badge-mini {
        font-size: 9.5px;
        font-weight: 600;
        text-transform: uppercase;
        padding: 1px 6px;
        border-radius: 8px;
      }

      .assign-team-box {
        display: flex;
        gap: 6px;
        align-items: center;
      }

      .text-box-sm {
        padding: 6px 10px;
        font-size: 12px;
        width: 100px;
        border-radius: 14px;
      }

      .btn-indigo {
        background: #5856D6;
        box-shadow: 0 2px 6px rgba(88, 86, 214, 0.2);
      }
      .btn-indigo:hover {
        background: #4745c4;
      }

      .btn-teal {
        background: #30B0C7;
        box-shadow: 0 2px 6px rgba(48, 176, 199, 0.2);
      }
      .btn-teal:hover {
        background: #259cb2;
      }

      .state-fixed-label {
        font-size: 12px;
        font-weight: 500;
        color: #248a3d;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .state-closed-label {
        font-size: 12px;
        color: var(--text-secondary);
      }

      /* Repair Proof inline widget inside table row */
      .repair-upload-inline {
        width: 100%;
        max-width: 320px;
        padding: 16px;
        margin-top: 8px;
        position: relative;
        background: #fff;
        border: 0.5px solid rgba(0, 0, 0, 0.08);
      }

      .proof-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .proof-header h5 {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .close-inline {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 14px;
      }

      .proof-form-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 14px;
      }

      .form-group-proof {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .form-group-proof label {
        font-size: 10px;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
      }

      .file-control {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .proof-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      /* Tab 3 Details */
      .priority-algo-info {
        margin: 0 24px 20px;
        padding: 12px 16px;
        background: rgba(0, 122, 255, 0.04);
        border: 0.5px solid rgba(0, 122, 255, 0.15);
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 12.5px;
        color: var(--primary);
      }

      .priority-algo-info i {
        font-size: 16px;
      }

      .priority-score-rhi-cell {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .priority-pill {
        font-family: 'Outfit', sans-serif;
        font-size: 11.5px;
        font-weight: 700;
        color: white;
        padding: 4px 10px;
        border-radius: 12px;
        display: inline-block;
      }

      .complaints-text {
        font-weight: 600;
        color: #b28900;
      }

      /* Right sidebar widgets styling */
      .widget-card {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .widget-title {
        font-family: 'Outfit', sans-serif;
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-secondary);
      }

      .circular-progress-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .circular-svg {
        width: 110px;
        height: 110px;
        transform: rotate(-90deg);
      }

      .svg-track {
        fill: none;
        stroke: rgba(0, 0, 0, 0.04);
        stroke-width: 8px;
      }

      .svg-fill {
        fill: none;
        stroke-width: 8px;
        stroke-linecap: round;
      }

      .fill-budget {
        stroke: var(--primary);
        stroke-dasharray: 251.2;
        stroke-dashoffset: 90.4; /* (100 - 64)% of 251.2 */
      }

      .svg-text {
        font-family: 'Outfit', sans-serif;
        font-size: 20px;
        font-weight: 700;
        fill: var(--text-primary);
        transform: rotate(90deg);
        transform-origin: center;
      }

      .widget-stats-info {
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .widget-stat-highlight {
        font-family: 'Outfit', sans-serif;
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .widget-stat-unit {
        font-size: 12px;
        font-weight: 400;
        color: var(--text-secondary);
      }

      .widget-stat-sub {
        font-size: 11.5px;
        color: var(--text-secondary);
      }

      /* Contractor lists */
      .contractor-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .contractor-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .contractor-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .contractor-name {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 13.5px;
      }

      .badge-active-jobs {
        font-size: 10px;
        font-weight: 500;
        background: rgba(0, 0, 0, 0.05);
        color: var(--text-secondary);
        padding: 2px 8px;
        border-radius: 8px;
      }

      .progress-bar-track {
        height: 5px;
        background: rgba(0, 0, 0, 0.04);
        border-radius: 3px;
        overflow: hidden;
      }

      .progress-bar-fill {
        height: 100%;
        border-radius: 3px;
      }

      .fill-green { background: var(--success); }
      .fill-yellow { background: var(--warning); }

      .contractor-meta-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 500;
      }

      .text-green { color: #248a3d; }
      .text-yellow { color: #b28900; }

      .contractor-rating {
        color: var(--text-secondary);
      }

      /* Maintenance Schedule list */
      .maintenance-schedule-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .maintenance-item {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .maint-icon-square {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        flex-shrink: 0;
      }

      .bg-blue-tint { background: rgba(0, 122, 255, 0.08); color: var(--primary); }
      .bg-purple-tint { background: rgba(191, 90, 242, 0.08); color: var(--forecast); }
      .bg-cyan-tint { background: rgba(90, 200, 250, 0.1); color: #00a2d9; }

      .maint-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .maint-road-name {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 13px;
      }

      .maint-meta {
        font-size: 11px;
        color: var(--text-secondary);
      }

      /* Error styling */
      .error-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 20px;
        margin-bottom: 24px;
        border-color: rgba(255, 69, 58, 0.3) !important;
        background: rgba(255, 69, 58, 0.06) !important;
      }

      .error-content {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .error-text {
        font-weight: 500;
        color: #d70015;
        font-size: 13.5px;
      }

      /* Toasts container */
      .toast-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .toast {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        min-width: 280px;
        animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .toast-success {
        border-color: rgba(48, 209, 88, 0.3) !important;
        background: rgba(255,255,255,0.9);
        box-shadow: 0 4px 16px rgba(48, 209, 88, 0.08);
      }

      .toast-success .toast-icon {
        color: var(--success);
      }

      .toast-error {
        border-color: rgba(255, 69, 58, 0.3) !important;
        background: rgba(255,255,255,0.9);
        box-shadow: 0 4px 16px rgba(255, 69, 58, 0.08);
      }

      .toast-error .toast-icon {
        color: var(--danger);
      }

      .toast-message {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
      }

      @keyframes toastSlideIn {
        from { opacity: 0; transform: translateY(12px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px;
        gap: 16px;
        color: var(--text-secondary);
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

      /* Responsive rules */
      @media (max-width: 1200px) {
        .dashboard-columns-grid {
          grid-template-columns: 1fr;
        }
        .dashboard-side-column {
          position: static;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
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
        .admin-table th:nth-child(3),
        .admin-table td:nth-child(3),
        .admin-table th:nth-child(4),
        .admin-table td:nth-child(4) {
          display: none;
        }
        .tab-btn {
          padding: 8px 10px;
          font-size: 11.5px;
          border-radius: 8px;
        }
        .tab-btn i {
          display: none;
        }
        .filter-row {
          flex-direction: column;
          align-items: stretch;
        }
        .filter-input {
          max-width: none;
        }
      }
    `]
})
export class AdminComponent implements OnInit {
    activeTab: 'detections' | 'citizenReports' | 'priorityRoads' = 'detections';

    // State
    loadingStats = true;
    loadingTable = true;
    loadingCitizenReports = false;
    loadingPriorityRoads = false;
    error: string | null = null;

    // Stats
    stats = {
        totalReports: 0,
        fixedReports: 0,
        pendingReports: 0,
        criticalPotholes: 0
    };

    // Filters
    filters = {
        status: '',
        severity: '',
        dateFrom: '',
        dateTo: ''
    };

    // Table data
    detections: AdminDetection[] = [];
    currentPage = 1;
    totalPages = 1;
    totalItems = 0;
    limit = 20;

    // Citizen Reports
    citizenReports: any[] = [];
    assignedTeamInputs: { [key: string]: string } = {};
    uploadingRepairId: string | null = null;
    repairForm = {
        afterImage: null as File | null,
        beforeImage: null as File | null,
        notes: '',
        team: ''
    };

    // Priority Roads
    priorityRoads: any[] = [];

    // Toasts
    toasts: ToastMessage[] = [];
    private toastId = 0;

    constructor(private apiService: ApiService) { }

    ngOnInit(): void {
        this.loadStats();
        this.loadDetections();
    }

    // ─── Data Loading ──────────────────────────────────────────

    loadStats(): void {
        this.loadingStats = true;
        this.apiService.getAdminStats().subscribe({
            next: (res: any) => {
                if (res.success && res.stats) {
                    this.stats = {
                        totalReports: res.stats.totalReports || 0,
                        fixedReports: res.stats.fixedReports || 0,
                        pendingReports: res.stats.pendingReports || 0,
                        criticalPotholes: res.stats.criticalPotholes || 0
                    };
                }
                this.loadingStats = false;
            },
            error: (err) => {
                console.error('Failed to load admin stats:', err);
                this.loadingStats = false;
                this.error = 'Failed to load dashboard statistics. Please check your connection.';
            }
        });
    }

    loadDetections(): void {
        this.loadingTable = true;
        const activeFilters: any = {};
        if (this.filters.status) activeFilters.status = this.filters.status;
        if (this.filters.severity) activeFilters.severity = this.filters.severity;
        if (this.filters.dateFrom) activeFilters.dateFrom = this.filters.dateFrom;
        if (this.filters.dateTo) activeFilters.dateTo = this.filters.dateTo;

        this.apiService.getAdminDetections(this.currentPage, this.limit, activeFilters).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.detections = (res.data || []).map((d: any) => ({
                        ...d,
                        reportStatus: d.reportStatus || 'reported'
                    }));
                    if (res.pagination) {
                        this.totalItems = res.pagination.total || 0;
                        this.totalPages = res.pagination.totalPages || 1;
                        this.currentPage = res.pagination.page || 1;
                    }
                }
                this.loadingTable = false;
                this.error = null;
            },
            error: (err) => {
                console.error('Failed to load admin detections:', err);
                this.loadingTable = false;
                this.error = 'Failed to load reports. Please check your connection and try again.';
            }
        });
    }

    retryLoad(): void {
        this.error = null;
        this.loadStats();
        if (this.activeTab === 'detections') this.loadDetections();
        if (this.activeTab === 'citizenReports') this.loadCitizenReports();
        if (this.activeTab === 'priorityRoads') this.loadPriorityRoads();
    }

    // ─── Tabs ─────────────────────────────────────────────────
    setTab(tab: 'detections' | 'citizenReports' | 'priorityRoads'): void {
        this.activeTab = tab;
        if (tab === 'detections') this.loadDetections();
        if (tab === 'citizenReports') this.loadCitizenReports();
        if (tab === 'priorityRoads') this.loadPriorityRoads();
    }

    loadCitizenReports(): void {
        this.loadingCitizenReports = true;
        this.apiService.getCitizenReports().subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.citizenReports = res.data || [];
                }
                this.loadingCitizenReports = false;
            },
            error: (err) => {
                console.error('Failed to load citizen reports:', err);
                this.loadingCitizenReports = false;
                this.showToast('Failed to load citizen reports.', 'error');
            }
        });
    }

    loadPriorityRoads(): void {
        this.loadingPriorityRoads = true;
        this.apiService.getRoadPriority().subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.priorityRoads = res.data || [];
                }
                this.loadingPriorityRoads = false;
            },
            error: (err) => {
                console.error('Failed to load priority roads:', err);
                this.loadingPriorityRoads = false;
                this.showToast('Failed to load priority roads.', 'error');
            }
        });
    }

    // ─── Citizen Report Workflow Actions ──────────────────────
    updateLifecycle(reportId: string, lifecycle: string): void {
        this.apiService.updateReportLifecycle(reportId, lifecycle).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.showToast(`Report updated to "${this.getLifecycleDisplay(lifecycle)}"`, 'success');
                    this.loadCitizenReports();
                    this.loadStats();
                } else {
                    this.showToast('Failed to update report stage.', 'error');
                }
            },
            error: (err) => {
                console.error(err);
                this.showToast('Error updating report lifecycle stage.', 'error');
            }
        });
    }

    assignTeam(reportId: string): void {
        const teamName = this.assignedTeamInputs[reportId];
        if (!teamName || !teamName.trim()) {
            this.showToast('Please enter a crew/team name first.', 'error');
            return;
        }

        this.apiService.updateReportLifecycle(reportId, 'assigned', teamName.trim()).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.showToast(`Crew "${teamName}" assigned to report.`, 'success');
                    this.assignedTeamInputs[reportId] = '';
                    this.loadCitizenReports();
                } else {
                    this.showToast('Failed to assign team.', 'error');
                }
            },
            error: (err) => {
                console.error(err);
                this.showToast('Error assigning team.', 'error');
            }
        });
    }

    startRepairProofUpload(rep: any): void {
        this.uploadingRepairId = rep.id;
        this.repairForm = {
            afterImage: null,
            beforeImage: null,
            notes: '',
            team: rep.assignedTeam || ''
        };
    }

    cancelRepairProofUpload(): void {
        this.uploadingRepairId = null;
    }

    onFileSelected(event: any, field: 'afterImage' | 'beforeImage'): void {
        const file = event.target.files[0];
        if (file) {
            this.repairForm[field] = file;
        }
    }

    submitRepairProof(reportId: string): void {
        if (!this.repairForm.afterImage) {
            this.showToast('After-repair image is required.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('afterImage', this.repairForm.afterImage);
        if (this.repairForm.beforeImage) {
            formData.append('beforeImage', this.repairForm.beforeImage);
        }
        formData.append('citizenReportId', reportId);
        formData.append('repairNotes', this.repairForm.notes);
        formData.append('repairTeam', this.repairForm.team || 'Municipal Team');

        this.apiService.submitRepairProof(formData).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.showToast('Repair proof uploaded. Status is now Fixed!', 'success');
                    this.uploadingRepairId = null;
                    this.loadCitizenReports();
                    this.loadStats();
                } else {
                    this.showToast('Failed to submit repair proof.', 'error');
                }
            },
            error: (err) => {
                console.error(err);
                this.showToast('Error submitting repair proof.', 'error');
            }
        });
    }

    getFriendlyBadgeClass(status: string): string {
        const map: any = {
            reported: 'medium_risk',
            verified: 'healthy',
            assigned: 'medium_risk',
            in_progress: 'poor',
            fixed: 'healthy',
            closed: 'healthy'
        };
        return map[status] || 'healthy';
    }

    getLifecycleDisplay(status: string): string {
        const map: any = {
            reported: 'Reported',
            verified: 'Verified',
            assigned: 'Assigned',
            in_progress: 'In Progress',
            fixed: 'Fixed',
            closed: 'Closed'
        };
        return map[status] || status;
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

    getPriorityColor(score: number): string {
        if (score > 0.75) return '#FF453A'; // red (var(--danger))
        if (score > 0.5) return '#FF9F0A';  // orange
        if (score > 0.25) return '#FFD60A'; // yellow (var(--warning))
        return '#30D158'; // green (var(--success))
    }

    // ─── Filters ──────────────────────────────────────────────

    applyFilters(): void {
        this.currentPage = 1;
        this.loadDetections();
    }

    clearFilters(): void {
        this.filters = {
            status: '',
            severity: '',
            dateFrom: '',
            dateTo: ''
        };
        this.currentPage = 1;
        this.loadDetections();
    }

    // ─── Status Update ────────────────────────────────────────

    onStatusChange(det: AdminDetection): void {
        const newStatus = det.reportStatus;
        this.apiService.updateReportStatus(det.id, newStatus).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.showToast(`Status updated to "${this.getStatusDisplayName(newStatus)}"`, 'success');
                    this.loadStats();
                } else {
                    this.showToast('Failed to update status.', 'error');
                }
            },
            error: () => {
                this.showToast('Error updating status. Please try again.', 'error');
            }
        });
    }

    // ─── Delete ───────────────────────────────────────────────

    deleteReport(det: AdminDetection): void {
        const confirmed = confirm(
            `Are you sure you want to delete the report for "${det.originalFilename}"?\n\nThis action cannot be undone.`
        );
        if (!confirmed) return;

        this.apiService.deleteDetection(det.id).subscribe({
            next: () => {
                this.showToast('Report deleted successfully.', 'success');
                this.loadStats();
                this.loadDetections();
            },
            error: () => {
                this.showToast('Failed to delete report. Please try again.', 'error');
            }
        });
    }

    // ─── Pagination ───────────────────────────────────────────

    goToPage(page: number): void {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.loadDetections();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    get paginationStart(): number {
        return Math.min((this.currentPage - 1) * this.limit + 1, this.totalItems);
    }

    get paginationEnd(): number {
        return Math.min(this.currentPage * this.limit, this.totalItems);
    }

    get pageNumbers(): number[] {
        const pages: number[] = [];
        const maxVisible = 5;
        let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(this.totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    }

    // ─── Helpers ──────────────────────────────────────────────

    formatDate(dateStr: string): string {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return '—';
        }
    }

    truncateFilename(name: string): string {
        if (!name) return 'Unknown';
        return name.length > 24 ? name.substring(0, 21) + '...' : name;
    }

    getStatusDisplayName(status: string): string {
        const map: { [key: string]: string } = {
            'reported': 'Reported',
            'under_review': 'Under Review',
            'in_progress': 'In Progress',
            'fixed': 'Fixed'
        };
        return map[status] || status;
    }

    onImageError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.src = 'data:image/svg+xml;base64,' + btoa(
            '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
            '<rect width="48" height="48" fill="#F5F5F7" rx="8"/>' +
            '<text x="24" y="28" text-anchor="middle" fill="#6E6E73" font-size="14">📷</text>' +
            '</svg>'
        );
    }

    // ─── Toast System ─────────────────────────────────────────

    showToast(message: string, type: 'success' | 'error'): void {
        const id = ++this.toastId;
        this.toasts.push({ id, message, type });

        setTimeout(() => {
            this.toasts = this.toasts.filter(t => t.id !== id);
        }, 3000);
    }
}
