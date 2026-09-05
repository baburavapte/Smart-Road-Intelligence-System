import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { SlaCountdownComponent } from '../shared/sla-countdown.component';
import { SkeletonComponent } from '../shared/skeleton.component';
import { ErrorCardComponent } from '../shared/error-card.component';
import { environment } from '../../../environments/environment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CitizenReport {
  id: string;
  roadName: string;
  zone: string;
  severity: string;
  aiScore: number;
  daysOpen: number;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  description: string;
  reportLifecycle: string;
  assignedTeam: string;
  createdAt: string;
  verifiedAt?: string;
  assignedAt?: string;
  fixedAt?: string;
  closedAt?: string;
  updatedAt?: string;
  selected?: boolean;
  annotatedImage?: string;
  latitude?: number;
  longitude?: number;
}

@Component({
  selector: 'app-reports-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    SlaCountdownComponent,
    SkeletonComponent,
    ErrorCardComponent
  ],
  template: `
    <div class="page-container flex-page" role="main">
      <div class="container">
        
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">Reports Management</h1>
            <p class="page-header-subtitle">
              {{ totalRecords }} total reports · {{ openReportsCount }} open · {{ overdueReportsCount }} overdue
            </p>
          </div>
          <div class="page-header-actions">
            <button class="btn-ghost" (click)="exportCSV()"><i class="ti ti-file-text"></i> Export CSV</button>
            <button class="btn-ghost" (click)="exportPDF()"><i class="ti ti-file-export"></i> Export PDF</button>
            <button class="btn-ghost" style="color: #FF453A;" (click)="logout()"><i class="ti ti-logout"></i> Logout</button>
          </div>
        </header>

        <!-- Glass Filter Bar -->
        <section class="filter-bar glass-card animate-fade-in-up">
          <div class="filter-grid" role="search" aria-label="Reports Filters">
            
            <div class="filter-group">
              <label class="form-label">Zone</label>
              <select [(ngModel)]="filterZone" (change)="applyFilters()" class="form-input">
                <option value="">All Zones</option>
                <option value="Zone A">Zone A</option>
                <option value="Zone B">Zone B</option>
                <option value="Zone C">Zone C</option>
                <option value="Zone D">Zone D</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="form-label">Severity</label>
              <select [(ngModel)]="filterSeverity" (change)="applyFilters()" class="form-input">
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="medium">Moderate</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="form-label">Status</label>
              <select [(ngModel)]="filterStatus" (change)="applyFilters()" class="form-input">
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="fixed">Fixed</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="form-label">Date From</label>
              <input type="date" [(ngModel)]="filterDateFrom" (change)="applyFilters()" class="form-input" />
            </div>

            <div class="filter-group">
              <label class="form-label">Date To</label>
              <input type="date" [(ngModel)]="filterDateTo" (change)="applyFilters()" class="form-input" />
            </div>

            <div class="filter-group">
              <label class="form-label">Contractor</label>
              <select [(ngModel)]="filterContractor" (change)="applyFilters()" class="form-input">
                <option value="">All Contractors</option>
                <option *ngFor="let c of contractors" [value]="c.name">{{ c.name }}</option>
              </select>
            </div>

            <div class="filter-group col-span-2">
              <label class="form-label">Search Road</label>
              <input 
                type="text" 
                [(ngModel)]="searchRoad" 
                (input)="onSearchInput()" 
                placeholder="Search road name..." 
                class="form-input" 
              />
            </div>

          </div>

          <div class="filter-actions-row">
            <span class="record-count" *ngIf="!loading && !error && reports.length > 0">
              Showing {{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, totalRecords) }} of {{ totalRecords }} reports
            </span>
            
            <button class="btn-ghost" (click)="resetFilters()"><i class="ti ti-x"></i> Reset Filters</button>
            <button class="btn-ghost" (click)="exportCSV()"><i class="ti ti-file-text"></i> Export CSV</button>
            <button class="btn-ghost" (click)="exportPDF()"><i class="ti ti-file-export"></i> Export PDF</button>
          </div>
        </section>

        <!-- Sticky Bulk Selection Toolbar -->
        <div class="bulk-toolbar glass-card animate-slide-down" *ngIf="getSelectedCount() > 0">
          <ng-container *ngIf="!showBulkCloseConfirm">
            <div class="bulk-info">
              <i class="ti ti-checkbox"></i>
              <span><strong>{{ getSelectedCount() }}</strong> reports selected</span>
            </div>
            <div class="bulk-actions">
              <button class="btn-ghost btn-sm" (click)="openBulkAssignModal()"><i class="ti ti-user-check"></i> Assign</button>
              <button class="btn-ghost btn-sm" (click)="bulkEscalate()"><i class="ti ti-arrow-up"></i> Escalate</button>
              <button class="btn-ghost btn-sm" (click)="exportCSV()"><i class="ti ti-file-export"></i> Export</button>
              <button class="btn-danger btn-sm" (click)="showBulkCloseConfirm = true"><i class="ti ti-circle-x"></i> Close</button>
              <a href="#" class="clear-selection-link" (click)="clearSelection($event)">✕ Clear selection</a>
            </div>
          </ng-container>

          <ng-container *ngIf="showBulkCloseConfirm">
            <div class="bulk-info confirm-msg">
              <i class="ti ti-alert-triangle text-danger"></i>
              <span>Close {{ getSelectedCount() }} reports? This cannot be undone.</span>
            </div>
            <div class="bulk-actions">
              <button class="btn-danger btn-sm" (click)="confirmBulkClose()">Confirm</button>
              <button class="btn-ghost btn-sm" (click)="showBulkCloseConfirm = false">Cancel</button>
            </div>
          </ng-container>
        </div>

        <!-- Table Loading State -->
        <ng-container *ngIf="loading">
          <app-skeleton type="table" height="320px"></app-skeleton>
        </ng-container>

        <!-- Table Error State -->
        <app-error-card
          *ngIf="!loading && error"
          [title]="'Failed to load reports'"
          [message]="errorMessage"
          (retry)="loadReports()">
        </app-error-card>

        <!-- Table Empty State -->
        <div class="empty-state glass-card text-center" *ngIf="!loading && !error && reports.length === 0" style="padding: 40px;">
          <i class="ti ti-inbox" style="font-size: 48px; color: var(--color-muted); margin-bottom: 12px; display: inline-block;"></i>
          <h3>No reports found</h3>
          <p class="meta">No citizen reports match the current filter criteria.</p>
        </div>

        <!-- Table Data Card -->
        <section class="glass-card table-card animate-fade-in-up" *ngIf="!loading && !error && reports.length > 0">
          <div class="table-scroll-container">
            <table class="reports-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">
                    <input type="checkbox" (change)="toggleSelectAll($event)" [checked]="isAllSelected()" />
                  </th>
                  <th (click)="toggleSort('id')" class="sortable-header">
                    # <i class="ti" [ngClass]="getSortIcon('id')"></i>
                  </th>
                  <th (click)="toggleSort('roadName')" class="sortable-header">
                    Road Name <i class="ti" [ngClass]="getSortIcon('roadName')"></i>
                  </th>
                  <th (click)="toggleSort('zone')" class="sortable-header">
                    Zone <i class="ti" [ngClass]="getSortIcon('zone')"></i>
                  </th>
                  <th (click)="toggleSort('severity')" class="sortable-header">
                    Severity <i class="ti" [ngClass]="getSortIcon('severity')"></i>
                  </th>
                  <th (click)="toggleSort('aiScore')" class="sortable-header">
                    AI Score <i class="ti" [ngClass]="getSortIcon('aiScore')"></i>
                  </th>
                  <th (click)="toggleSort('daysOpen')" class="sortable-header">
                    Days Open <i class="ti" [ngClass]="getSortIcon('daysOpen')"></i>
                  </th>
                  <th>SLA Status</th>
                  <th (click)="toggleSort('assignedTeam')" class="sortable-header">
                    Assigned To <i class="ti" [ngClass]="getSortIcon('assignedTeam')"></i>
                  </th>
                  <th (click)="toggleSort('reportLifecycle')" class="sortable-header">
                    Status <i class="ti" [ngClass]="getSortIcon('reportLifecycle')"></i>
                  </th>
                  <th style="text-align: center;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let rep of reports">
                  <!-- Row -->
                  <tr [class.expanded-row]="expandedReportId === rep.id" [class.selected-tr]="rep.selected">
                    <td style="text-align: center; vertical-align: middle;">
                      <input type="checkbox" [(ngModel)]="rep.selected" />
                    </td>
                    <td>#{{ rep.id.substring(0, 6) }}</td>
                    <td class="bold-td highlight-on-hover" (click)="toggleRow(rep.id)">
                      <i class="ti" [ngClass]="expandedReportId === rep.id ? 'ti-chevron-down' : 'ti-chevron-right'"></i>
                      {{ rep.roadName }}
                    </td>
                    <td>{{ rep.zone }}</td>
                    <td><app-status-badge [status]="rep.severity" type="severity"></app-status-badge></td>
                    <td>
                      <span [style.color]="rep.aiScore > 85 ? '#30D158' : (rep.aiScore >= 65 ? '#FFD60A' : '#FF453A')" style="font-weight: 700;">
                        {{ rep.aiScore }}%
                      </span>
                    </td>
                    <td>
                      <span [class.overdue-red-text]="isOverdue(rep)">
                        {{ rep.daysOpen }}d
                      </span>
                    </td>
                    <td>
                      <span class="sla-pill" [ngClass]="getSLAPillClass(rep)">
                        {{ getSLALabel(rep) }}
                      </span>
                    </td>
                    <td>
                      <span *ngIf="rep.assignedTeam" class="bold-td">{{ rep.assignedTeam }}</span>
                      <span *ngIf="!rep.assignedTeam" style="color: #8E8E93; font-style: italic;">Unassigned</span>
                    </td>
                    <td><app-status-badge [status]="rep.reportLifecycle" type="lifecycle"></app-status-badge></td>
                    <td>
                      <div class="action-btn-row">
                        <button class="btn-ghost-sm" (click)="toggleRow(rep.id)" title="View Details">
                          <i class="ti ti-eye"></i>
                        </button>
                        <button class="btn-ghost-sm" (click)="openAssignModal(rep)" title="Assign Crew">
                          <i class="ti ti-user-check"></i>
                        </button>
                        <button class="btn-ghost-sm" (click)="escalateReport(rep)" title="Escalate Report">
                          <i class="ti ti-arrow-up"></i>
                        </button>
                        <button class="btn-ghost-sm text-danger" (click)="closeReport(rep)" title="Close Report">
                          <i class="ti ti-circle-x"></i>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <!-- Row Expanded Detail Card -->
                  <tr *ngIf="expandedReportId === rep.id">
                    <td colspan="11" style="padding: 0;">
                      <div class="detail-panel animate-fade-in">
                        <div class="detail-grid">
                          
                          <!-- Col 1: Annotated Image -->
                          <div class="detail-col image-col">
                            <span class="form-label">Annotated Detection Image</span>
                            <div class="img-container glass-card">
                              <img *ngIf="rep.annotatedImage" [src]="rep.annotatedImage" alt="Annotated detection output" class="pothole-img" />
                              <div *ngIf="!rep.annotatedImage" class="img-placeholder text-center">
                                <i class="ti ti-photo" style="font-size: 36px; color: var(--color-muted);"></i>
                                <p class="meta">No Image Available</p>
                              </div>
                            </div>
                            <span class="img-caption" *ngIf="rep.annotatedImage">
                              Detected by YOLOv8 · Confidence: {{ rep.aiScore }}%
                            </span>
                          </div>

                          <!-- Col 2: GPS Details -->
                          <div class="detail-col gps-col flex-col">
                            <span class="form-label">GPS Geolocation</span>
                            <div class="gps-coords-box">
                              <div class="gps-field">
                                <span class="meta">Latitude:</span>
                                <span class="bold-td">{{ rep.latitude || '22.3072' }}</span>
                                <button class="copy-btn" (click)="copyText(rep.latitude || 22.3072)"><i class="ti ti-copy"></i></button>
                              </div>
                              <div class="gps-field" style="margin-top: 6px;">
                                <span class="meta">Longitude:</span>
                                <span class="bold-td">{{ rep.longitude || '73.1812' }}</span>
                                <button class="copy-btn" (click)="copyText(rep.longitude || 73.1812)"><i class="ti ti-copy"></i></button>
                              </div>
                            </div>

                            <div style="margin-top: 12px;">
                              <span class="form-label">Reported By</span>
                              <p class="bold-td">{{ maskEmail(rep.reporterEmail) }}</p>
                              <span class="meta">Date: {{ rep.createdAt | date:'dd MMM yyyy HH:mm' }}</span>
                            </div>

                            <div style="margin-top: 12px;">
                              <span class="form-label">Zone</span>
                              <p class="bold-td" style="display: flex; align-items: center; gap: 6px;">
                                <span class="zone-dot-indicator" [style.background]="getZoneColor(rep.zone)"></span>
                                {{ rep.zone }}
                              </p>
                            </div>

                            <div style="margin-top: 12px;">
                              <span class="form-label">Citizen Note</span>
                              <p class="meta citizen-note-text">"{{ rep.description || 'No description provided.' }}"</p>
                            </div>
                          </div>

                          <!-- Col 3: Repair Timeline -->
                          <div class="detail-col timeline-col flex-col">
                            <span class="form-label">Repair Timeline</span>
                            
                            <div class="vertical-timeline">
                              <div class="timeline-step" [class.active]="rep.reportLifecycle === 'reported'">
                                <span class="timeline-dot reported"></span>
                                <div class="step-content">
                                  <h5>Reported</h5>
                                  <p class="meta">{{ rep.createdAt | date:'dd MMM yyyy HH:mm' }} · Citizen</p>
                                </div>
                              </div>
                              <div class="timeline-step" *ngIf="rep.verifiedAt || rep.reportLifecycle !== 'reported'" [class.active]="rep.reportLifecycle === 'verified'">
                                <span class="timeline-dot verified"></span>
                                <div class="step-content">
                                  <h5>Verified</h5>
                                  <p class="meta">{{ rep.verifiedAt ? (rep.verifiedAt | date:'dd MMM yyyy HH:mm') : 'Completed' }} · Officer</p>
                                </div>
                              </div>
                              <div class="timeline-step" *ngIf="rep.assignedAt || (rep.reportLifecycle !== 'reported' && rep.reportLifecycle !== 'verified')" [class.active]="rep.reportLifecycle === 'assigned'">
                                <span class="timeline-dot assigned"></span>
                                <div class="step-content">
                                  <h5>Assigned</h5>
                                  <p class="meta">{{ rep.assignedAt ? (rep.assignedAt | date:'dd MMM yyyy HH:mm') : 'Completed' }} · Crew: {{ rep.assignedTeam || 'TBD' }}</p>
                                </div>
                              </div>
                              <div class="timeline-step" *ngIf="rep.reportLifecycle === 'in_progress' || rep.fixedAt || rep.closedAt" [class.active]="rep.reportLifecycle === 'in_progress'">
                                <span class="timeline-dot in_progress"></span>
                                <div class="step-content">
                                  <h5>In Progress</h5>
                                  <p class="meta">Crews dispatched</p>
                                </div>
                              </div>
                              <div class="timeline-step" *ngIf="rep.fixedAt" [class.active]="rep.reportLifecycle === 'fixed'">
                                <span class="timeline-dot fixed"></span>
                                <div class="step-content">
                                  <h5>Fixed</h5>
                                  <p class="meta">{{ rep.fixedAt | date:'dd MMM yyyy HH:mm' }} · Repair proof submitted</p>
                                </div>
                              </div>
                              <div class="timeline-step" *ngIf="rep.closedAt" [class.active]="rep.reportLifecycle === 'closed'">
                                <span class="timeline-dot closed"></span>
                                <div class="step-content">
                                  <h5>Closed</h5>
                                  <p class="meta">{{ rep.closedAt | date:'dd MMM yyyy HH:mm' }} · Closed</p>
                                </div>
                              </div>
                            </div>

                            <div style="margin-top: auto; padding-top: 14px;">
                              <span class="form-label" style="margin-bottom: 2px;">SLA Deadline Countdown</span>
                              <app-sla-countdown [createdAt]="rep.createdAt" [severity]="rep.severity"></app-sla-countdown>
                              
                              <button 
                                class="btn-primary btn-sm w-full" 
                                style="margin-top: 12px;" 
                                *ngIf="!rep.assignedTeam"
                                (click)="openAssignModal(rep)"
                              >
                                Schedule Repair
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    </td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <footer class="pagination-bar" style="padding: 12px 20px;">
            <span class="pagination-info">
              Showing {{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, totalRecords) }} of {{ totalRecords }} reports
            </span>
            
            <div class="pagination-controls">
              <button class="page-btn" [disabled]="page === 1" (click)="setPage(page - 1)" aria-label="Previous Page">
                <i class="ti ti-chevron-left" aria-hidden="true"></i>
              </button>
              
              <ng-container *ngFor="let p of getPageNumbers()">
                <span *ngIf="p === -1" class="pagination-ellipsis" style="padding: 0 4px; color: #6E6E73;">...</span>
                <button *ngIf="p !== -1" class="page-btn"
                        [class.active]="p === page"
                        (click)="setPage(p)">{{ p }}</button>
              </ng-container>
              
              <button class="page-btn" [disabled]="page === totalPages || totalPages === 0" (click)="setPage(page + 1)" aria-label="Next Page">
                <i class="ti ti-chevron-right" aria-hidden="true"></i>
              </button>
            </div>

            <div class="pagination-jump">
              <span>Go to</span>
              <input 
                type="number" 
                [min]="1" 
                [max]="totalPages"
                #jumpInput
                (keydown.enter)="setPage(+jumpInput.value); jumpInput.value=''"
                style="width: 55px;" 
                class="form-input" 
              />
            </div>
          </footer>
        </section>

      </div>
    </div>

    <!-- Assignment Modal Overlay -->
    <div class="modal-overlay animate-fade-in" *ngIf="showAssignModal" (click)="closeAssignModal()">
      <div class="modal-card glass-card animate-scale-in" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h3>{{ isBulkAssign ? 'Bulk Assign Reports' : 'Assign Report' }}</h3>
          <button class="modal-close-x" (click)="closeAssignModal()">&times;</button>
        </header>

        <div class="modal-summary-box">
          <p class="summary-road" *ngIf="!isBulkAssign">Road: <strong>{{ activeAssignReport?.roadName }}</strong></p>
          <p class="summary-road" *ngIf="isBulkAssign">Assigning <strong>{{ getSelectedCount() }} selected reports</strong> in bulk.</p>
          <div style="display: flex; gap: 6px; margin-top: 4px;" *ngIf="!isBulkAssign">
            <app-status-badge [status]="activeAssignReport?.severity" type="severity"></app-status-badge>
            <span class="modal-meta-badge">{{ activeAssignReport?.daysOpen }} days open</span>
          </div>
        </div>

        <form (ngSubmit)="submitAssignment()" #assignForm="ngForm">
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label">Select Contractor</label>
            <select class="form-input" [(ngModel)]="assignedContractorId" name="contractor" required>
              <option value="" disabled selected>Choose a contractor...</option>
              <option *ngFor="let c of contractors" [value]="c.id">
                {{ c.name }} ({{ c.specialization }} · {{ c.activeJobs }} active)
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Scheduled Date</label>
            <input 
              type="date" 
              class="form-input" 
              [(ngModel)]="assignScheduledDate" 
              name="scheduledDate" 
              [min]="todayDateString" 
              required 
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Notes (Optional)</label>
            <textarea 
              class="form-input" 
              [(ngModel)]="assignNotes" 
              name="notes" 
              placeholder="Enter instructions for the crew..." 
              maxlength="200" 
              rows="3"
            ></textarea>
          </div>
          
          <div class="modal-actions" style="margin-top: 20px;">
            <button type="button" class="btn-secondary" (click)="closeAssignModal()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="assignForm.invalid || submittingAssignment">
              {{ submittingAssignment ? 'Assigning...' : 'Assign Crew' }}
            </button>
          </div>
        </form>
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

    .filter-bar {
      padding: 16px 20px;
      border-radius: 16px;
      margin-bottom: 12px;
    }

    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .col-span-2 {
      grid-column: span 2;
    }

    @media (max-width: 768px) {
      .col-span-2 {
        grid-column: span 1;
      }
    }

    .filter-actions-row {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: flex-end;
      flex-wrap: wrap;
      border-top: 0.5px solid rgba(0, 0, 0, 0.05);
      padding-top: 10px;
    }

    .record-count {
      margin-right: auto;
      font-size: 12px;
      color: #6E6E73;
    }

    /* Bulk actions bar styling */
    .bulk-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(16px);
      border: 0.5px solid rgba(0, 122, 255, 0.2);
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 16px rgba(0, 122, 255, 0.08);
      margin-bottom: 12px;
    }

    .bulk-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #1D1D1F;
    }

    .bulk-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .clear-selection-link {
      font-size: 12px;
      color: #FF453A;
      text-decoration: none;
      font-weight: 500;
      margin-left: 6px;
    }
    .clear-selection-link:hover {
      text-decoration: underline;
    }

    /* Table & Headers */
    .table-card {
      border-radius: 20px;
      padding: 0;
      overflow: hidden;
    }

    .table-scroll-container {
      width: 100%;
      overflow-x: auto;
    }

    .reports-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }

    .reports-table th {
      padding: 10px 12px;
      background: rgba(0, 0, 0, 0.02);
      color: #6E6E73;
      font-weight: 600;
      border-bottom: 0.5px solid rgba(0, 0, 0, 0.05);
      user-select: none;
      white-space: nowrap;
    }

    .sortable-header {
      cursor: pointer;
      transition: color 0.2s;
    }
    .sortable-header:hover {
      color: #007AFF;
    }

    .reports-table td {
      padding: 12px;
      border-bottom: 0.5px solid rgba(0, 0, 0, 0.03);
      vertical-align: middle;
    }

    .reports-table tr {
      transition: background-color 0.2s;
    }

    .reports-table tbody tr:hover {
      background-color: rgba(0, 122, 255, 0.03);
    }

    .selected-tr {
      background-color: rgba(0, 122, 255, 0.06) !important;
      border-left: 3px solid #007AFF;
    }

    .bold-td {
      font-weight: 600;
      color: #1D1D1F;
    }

    .highlight-on-hover {
      cursor: pointer;
      user-select: none;
    }
    .highlight-on-hover:hover {
      color: #007AFF;
    }

    .overdue-red-text {
      color: #FF453A;
      font-weight: 700;
    }

    /* SLA Status pills */
    .sla-pill {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      display: inline-block;
    }
    .sla-ontime { background: rgba(48, 209, 88, 0.1); color: #30D158; }
    .sla-duesoon { background: rgba(255, 214, 10, 0.15); color: #FFD60A; }
    .sla-overdue { background: rgba(255, 69, 58, 0.1); color: #FF453A; }

    /* Actions icons */
    .action-btn-row {
      display: flex;
      align-items: center;
      gap: 4px;
      justify-content: flex-end;
    }
    .btn-ghost-sm {
      border: none; background: transparent; cursor: pointer; color: #6E6E73;
      width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; font-size: 13px;
    }
    .btn-ghost-sm:hover {
      background: rgba(0,0,0,0.05); color: #1D1D1F;
    }
    .btn-ghost-sm.text-danger:hover {
      background: rgba(255, 69, 58, 0.1); color: #FF453A;
    }

    /* Expand Panel */
    .detail-panel {
      background: rgba(255, 255, 255, 0.65);
      border-bottom: 0.5px solid rgba(0, 0, 0, 0.05);
      padding: 16px;
      width: 100%;
      box-sizing: border-box;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr;
      gap: 20px;
      width: 100%;
    }

    .detail-col {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .image-col .img-container {
      width: 100%;
      height: 180px;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.03);
    }
    .pothole-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .img-caption {
      font-size: 10px; color: #8E8E93; text-align: left; margin-top: 4px;
    }

    .gps-coords-box {
      width: 100%;
      background: rgba(0,0,0,0.02);
      border-radius: 10px;
      padding: 8px 12px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .gps-field {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }
    .copy-btn {
      border: none; background: transparent; cursor: pointer; color: #8E8E93; font-size: 10px; padding: 2px;
    }
    .copy-btn:hover { color: #007AFF; }

    .zone-dot-indicator {
      width: 8px; height: 8px; border-radius: 50%; display: inline-block;
    }

    .citizen-note-text {
      text-align: left;
      font-style: italic;
      line-height: 1.35;
      background: rgba(0,0,0,0.01);
      padding: 6px 10px;
      border-radius: 8px;
      border-left: 2px solid rgba(0,0,0,0.1);
    }

    /* Vertical Timeline */
    .vertical-timeline {
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
      padding-left: 14px;
      border-left: 1.5px solid rgba(0, 0, 0, 0.05);
      margin-left: 6px;
      text-align: left;
    }
    .timeline-step {
      position: relative;
    }
    .timeline-dot {
      position: absolute;
      left: -19px;
      top: 3px;
      width: 8px; height: 8px; border-radius: 50%;
      background: #8E8E93;
    }
    .timeline-dot.reported { background: #007AFF; }
    .timeline-dot.verified { background: #FF9F0A; }
    .timeline-dot.assigned { background: #BF5AF2; }
    .timeline-dot.in_progress { background: #FF3B30; }
    .timeline-dot.fixed { background: #30D158; }
    .timeline-dot.closed { background: #8E8E93; }

    .timeline-step.active .step-content h5 {
      color: #007AFF;
      font-weight: 600;
    }

    .step-content h5 {
      font-size: 11px; margin: 0 0 2px 0; color: #1D1D1F;
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .pagination-controls {
      display: flex; gap: 4px; align-items: center;
    }

    .page-btn {
      min-width: 28px; height: 28px; padding: 0 6px; border-radius: 6px;
      border: 0.5px solid rgba(0, 0, 0, 0.08); background: #fff;
      font-family: inherit; font-size: 12px; cursor: pointer; transition: all 0.2s;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .page-btn:hover:not([disabled]) {
      background: rgba(0, 122, 255, 0.08);
      border-color: rgba(0, 122, 255, 0.2);
    }
    .page-btn.active {
      background: #007AFF; color: #fff; border-color: #007AFF;
    }
    .page-btn[disabled] { opacity: 0.35; cursor: not-allowed; }
    .pagination-jump {
      display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6E6E73;
    }

    @media (max-width: 900px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .bulk-toolbar {
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
      }

      .bulk-actions {
        flex-wrap: wrap;
        gap: 6px;
      }

      .filter-actions-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .record-count {
        margin-right: 0;
      }

      .pagination-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .pagination-controls {
        flex-wrap: wrap;
      }

      .table-card {
        border-radius: 12px;
      }

      .reports-table {
        font-size: 11px;
      }

      .reports-table th,
      .reports-table td {
        padding: 8px 8px;
      }
    }

    @media (max-width: 480px) {
      .filter-bar {
        padding: 12px;
      }

      .filter-grid {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .col-span-2 {
        grid-column: span 1;
      }

      .bulk-toolbar {
        padding: 8px 12px;
      }

      .pagination-jump {
        display: none;
      }

      .modal-card {
        max-width: 100%;
        margin: 0 8px;
        padding: 16px;
        border-radius: 16px;
      }
    }


    /* Modal Overlay */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 2000;
      background: rgba(0,0,0,0.3);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-card {
      width: 100%;
      max-width: 400px;
      border-radius: 24px;
      padding: 24px;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.85);
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      border: 0.5px solid rgba(255,255,255,0.8);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .modal-header h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 700;
      margin: 0;
      color: #1D1D1F;
    }
    .modal-close-x {
      border: none; background: transparent; font-size: 20px; cursor: pointer; color: #8E8E93;
    }

    .modal-summary-box {
      background: rgba(0,0,0,0.03);
      padding: 10px 14px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .summary-road {
      font-size: 12px;
      color: #1D1D1F;
      margin: 0;
    }
    .modal-meta-badge {
      font-size: 10px;
      background: rgba(255, 69, 58, 0.1);
      color: #FF453A;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 6px;
    }

    .modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
  `]
})
export class ReportsManagementComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }

  reports: CitizenReport[] = [];
  contractors: any[] = [];
  expandedReportId: string | null = null;
  Math = Math;

  // Loading & Error States
  loading = true;
  error = false;
  errorMessage = 'Failed to load reports';

  // Statistics
  totalRecords = 0;
  openReportsCount = 0;
  overdueReportsCount = 0;

  // Pagination
  page = 1;
  limit = 25;
  totalPages = 0;

  // Sort settings
  sortByField = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Filters
  searchRoad = '';
  filterZone = '';
  filterSeverity = '';
  filterStatus = '';
  filterContractor = '';
  filterDateFrom = '';
  filterDateTo = '';

  // Assignment Modal
  showAssignModal = false;
  isBulkAssign = false;
  activeAssignReport: any = null;
  assignedContractorId = '';
  assignScheduledDate = '';
  assignNotes = '';
  submittingAssignment = false;
  todayDateString = new Date().toISOString().split('T')[0];

  // Bulk actions confirm
  showBulkCloseConfirm = false;

  private searchTimeout: any;

  // Services
  private apiService = inject(ApiService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    this.loadContractors();

    // URL sync read on initialization
    this.route.queryParams.subscribe(params => {
      this.searchRoad = params['search'] || '';
      this.filterZone = params['zone'] || '';
      this.filterSeverity = params['severity'] || '';
      this.filterStatus = params['status'] || '';
      this.filterContractor = params['contractor'] || '';
      this.filterDateFrom = params['dateFrom'] || '';
      this.filterDateTo = params['dateTo'] || '';
      this.page = params['page'] ? +params['page'] : 1;
      this.sortByField = params['sortBy'] || 'createdAt';
      this.sortDirection = (params['sortDir'] as 'asc' | 'desc') || 'desc';

      this.loadReports();
      this.loadStats();
    });
  }

  ngOnDestroy() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  private loadContractors() {
    this.http.get<{ success: boolean; data: any[] }>(`${environment.apiUrl}/contractors`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.contractors = res.data.map(c => ({
            id: c.id || c._id,
            name: c.name,
            specialization: c.specialization,
            rating: c.rating,
            activeJobs: c.activeJobs
          }));
        }
      }
    });
  }

  loadStats() {
    this.apiService.getCitizenReportStats().subscribe(res => {
      if (res.success && res.stats) {
        this.openReportsCount = (res.stats.reported || 0) + (res.stats.verified || 0) + (res.stats.assigned || 0) + (res.stats.in_progress || 0);
      }
    });
    this.http.get<any>(`${environment.apiUrl}/dashboard/kpis`).subscribe({
      next: res => {
        if (res.success || res.overdueCount !== undefined) {
          this.overdueReportsCount = res.overdueCount;
        }
      }
    });
  }

  loadReports() {
    this.loading = true;
    this.error = false;

    const extra = {
      zone: this.filterZone,
      severity: this.filterSeverity,
      status: this.filterStatus,
      contractor: this.filterContractor,
      search: this.searchRoad,
      dateFrom: this.filterDateFrom,
      dateTo: this.filterDateTo
    };

    this.apiService.getCitizenReports(undefined, undefined, this.page, this.limit, extra).subscribe({
      next: res => {
        this.loading = false;
        if (res.success && res.data) {
          this.reports = res.data.map((r: any) => ({
            id: r.id,
            roadName: r.roadName || (r.detection?.originalFilename ? r.detection.originalFilename.split('.')[0] : 'Main Road'),
            zone: r.zone || 'Zone A',
            severity: r.detection?.severity || 'low',
            aiScore: Math.round((r.detection?.detections?.[0]?.confidence || 0.95) * 100),
            daysOpen: Math.round((Date.now() - new Date(r.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
            reporterName: r.reporterName,
            reporterEmail: r.reporterEmail,
            reporterPhone: r.reporterPhone,
            description: r.description,
            reportLifecycle: r.reportLifecycle,
            assignedTeam: r.assignedTeam,
            createdAt: r.createdAt,
            verifiedAt: r.verifiedAt,
            assignedAt: r.assignedAt,
            fixedAt: r.fixedAt,
            closedAt: r.closedAt,
            updatedAt: r.updatedAt,
            annotatedImage: r.detection?.annotatedImage ? `${environment.apiUrl.replace('/api', '')}/results/${r.detection.annotatedImage}` : null,
            latitude: r.detection?.location?.coordinates?.[1] || 22.3072,
            longitude: r.detection?.location?.coordinates?.[0] || 73.1812
          }));

          this.totalRecords = res.pagination.total;
          this.totalPages = res.pagination.totalPages;

          // Apply client-side sorting
          this.sortReports();
        }
      },
      error: err => {
        this.loading = false;
        this.error = true;
        this.errorMessage = err.status === 0
          ? 'Server unreachable — check your connection'
          : err.status === 403
          ? 'You do not have permission to view this'
          : 'Failed to load reports';
        this.toast.error(this.errorMessage);
      }
    });
  }

  updateURL() {
    const queryParams: any = {};
    if (this.searchRoad) queryParams.search = this.searchRoad;
    if (this.filterZone) queryParams.zone = this.filterZone;
    if (this.filterSeverity) queryParams.severity = this.filterSeverity;
    if (this.filterStatus) queryParams.status = this.filterStatus;
    if (this.filterContractor) queryParams.contractor = this.filterContractor;
    if (this.filterDateFrom) queryParams.dateFrom = this.filterDateFrom;
    if (this.filterDateTo) queryParams.dateTo = this.filterDateTo;
    if (this.page > 1) queryParams.page = this.page;
    if (this.sortByField !== 'createdAt') queryParams.sortBy = this.sortByField;
    if (this.sortDirection !== 'desc') queryParams.sortDir = this.sortDirection;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: '',
    });
  }

  onSearchInput() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
    }, 400);
  }

  applyFilters() {
    this.page = 1;
    this.updateURL();
  }

  setPage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.updateURL();
  }

  resetFilters() {
    this.searchRoad = '';
    this.filterZone = '';
    this.filterSeverity = '';
    this.filterStatus = '';
    this.filterContractor = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.page = 1;
    this.updateURL();
  }

  toggleRow(id: string) {
    this.expandedReportId = this.expandedReportId === id ? null : id;
  }

  // SLA utilities
  isOverdue(report: CitizenReport): boolean {
    const limit = this.getSLALimitDays(report.severity);
    return report.daysOpen > limit && report.reportLifecycle !== 'fixed' && report.reportLifecycle !== 'closed';
  }

  getSLALimitDays(severity: string): number {
    if (severity === 'critical') return 3;
    if (severity === 'high' || severity === 'moderate' || severity === 'medium') return 7;
    return 14;
  }

  getSLALabel(report: CitizenReport): string {
    if (report.reportLifecycle === 'fixed' || report.reportLifecycle === 'closed') return 'On Time';
    const limit = this.getSLALimitDays(report.severity);
    if (report.daysOpen > limit) return 'Overdue';
    if (limit - report.daysOpen <= 2) return 'Due Soon';
    return 'On Time';
  }

  getSLAPillClass(report: CitizenReport): string {
    const label = this.getSLALabel(report);
    if (label === 'Overdue') return 'sla-overdue';
    if (label === 'Due Soon') return 'sla-duesoon';
    return 'sla-ontime';
  }

  // Row Actions
  openAssignModal(report: any) {
    this.isBulkAssign = false;
    this.activeAssignReport = report;
    this.assignedContractorId = '';
    this.assignScheduledDate = '';
    this.assignNotes = '';
    this.showAssignModal = true;
    this.submittingAssignment = false;
  }

  openBulkAssignModal() {
    this.isBulkAssign = true;
    this.activeAssignReport = null;
    this.assignedContractorId = '';
    this.assignScheduledDate = '';
    this.assignNotes = '';
    this.showAssignModal = true;
    this.submittingAssignment = false;
  }

  closeAssignModal() {
    this.showAssignModal = false;
    this.activeAssignReport = null;
  }

  submitAssignment() {
    if (!this.assignedContractorId || !this.assignScheduledDate) return;
    this.submittingAssignment = true;

    const contractor = this.contractors.find(c => c.id === this.assignedContractorId);
    if (!contractor) return;

    if (this.isBulkAssign) {
      const selected = this.reports.filter(r => r.selected);
      let count = 0;
      selected.forEach(r => {
        this.http.post(`${environment.apiUrl}/contractors/${this.assignedContractorId}/assign`, {
          reportId: r.id,
          scheduledDate: this.assignScheduledDate,
          notes: this.assignNotes
        }).subscribe({
          next: () => {
            count++;
            if (count === selected.length) {
              this.toast.success(`Assigned ${count} reports to ${contractor.name}`);
              this.showAssignModal = false;
              this.reports.forEach(x => x.selected = false);
              this.loadReports();
              this.loadStats();
            }
          }
        });
      });
    } else {
      this.http.post(`${environment.apiUrl}/contractors/${this.assignedContractorId}/assign`, {
        reportId: this.activeAssignReport.id,
        scheduledDate: this.assignScheduledDate,
        notes: this.assignNotes
      }).subscribe({
        next: () => {
          this.toast.success(`Report assigned to ${contractor.name}`);
          this.showAssignModal = false;
          this.loadReports();
          this.loadStats();
        },
        error: () => {
          this.submittingAssignment = false;
          this.toast.error('Failed to assign contractor');
        }
      });
    }
  }

  escalateReport(report: CitizenReport) {
    this.http.post<any>(`${environment.apiUrl}/reports/bulk-escalate`, { reportIds: [report.id] }).subscribe({
      next: () => {
        this.toast.warning('Report escalated to senior officer');
        this.loadReports();
      },
      error: () => {
        this.toast.error('Failed to escalate report');
      }
    });
  }

  closeReport(report: CitizenReport) {
    this.http.post<any>(`${environment.apiUrl}/reports/bulk-close`, { reportIds: [report.id] }).subscribe({
      next: () => {
        this.toast.success('Report ticket closed');
        this.loadReports();
        this.loadStats();
      },
      error: () => {
        this.toast.error('Failed to close ticket');
      }
    });
  }

  // Bulk selection handling
  toggleSelectAll(event: any) {
    const checked = event.target.checked;
    this.reports.forEach(r => r.selected = checked);
  }

  isAllSelected(): boolean {
    return this.reports.length > 0 && this.reports.every(r => r.selected);
  }

  getSelectedCount(): number {
    return this.reports.filter(r => r.selected).length;
  }

  clearSelection(event: Event) {
    event.preventDefault();
    this.reports.forEach(r => r.selected = false);
    this.showBulkCloseConfirm = false;
  }

  bulkEscalate() {
    const selectedIds = this.reports.filter(r => r.selected).map(r => r.id);
    this.http.post<any>(`${environment.apiUrl}/reports/bulk-escalate`, { reportIds: selectedIds }).subscribe({
      next: res => {
        this.toast.warning(`Escalated ${res.count || selectedIds.length} reports to senior officer`);
        this.reports.forEach(r => r.selected = false);
        this.loadReports();
      },
      error: () => {
        this.toast.error('Bulk escalation failed');
      }
    });
  }

  confirmBulkClose() {
    const selectedIds = this.reports.filter(r => r.selected).map(r => r.id);
    this.http.post<any>(`${environment.apiUrl}/reports/bulk-close`, { reportIds: selectedIds }).subscribe({
      next: res => {
        this.toast.success(`${res.count || selectedIds.length} reports closed successfully`);
        this.showBulkCloseConfirm = false;
        this.reports.forEach(r => r.selected = false);
        this.loadReports();
        this.loadStats();
      },
      error: () => {
        this.toast.error('Bulk closing failed');
      }
    });
  }

  // Sorting utilities
  toggleSort(field: string) {
    if (this.sortByField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByField = field;
      this.sortDirection = 'asc';
    }
    this.updateURL();
  }

  getSortIcon(field: string): string {
    if (this.sortByField !== field) return 'ti-arrows-sort text-muted';
    return this.sortDirection === 'asc' ? 'ti-arrow-up text-primary' : 'ti-arrow-down text-primary';
  }

  sortReports() {
    this.reports.sort((a, b) => {
      const valA = this.getSortValue(a, this.sortByField);
      const valB = this.getSortValue(b, this.sortByField);

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getSortValue(report: CitizenReport, field: string): any {
    switch (field) {
      case 'id': return report.id;
      case 'roadName': return report.roadName.toLowerCase();
      case 'zone': return report.zone;
      case 'severity': {
        const order: any = { low: 1, medium: 2, moderate: 2, high: 3, critical: 4 };
        return order[report.severity] || 0;
      }
      case 'aiScore': return report.aiScore;
      case 'daysOpen': return report.daysOpen;
      case 'assignedTeam': return (report.assignedTeam || '').toLowerCase();
      case 'reportLifecycle': return report.reportLifecycle;
      case 'createdAt': return new Date(report.createdAt).getTime();
      default: return 0;
    }
  }

  // Copy GPS to Clipboard
  copyText(val: any) {
    if (!val) return;
    navigator.clipboard.writeText(val.toString()).then(() => {
      this.toast.success('Coordinates copied');
    });
  }

  // Mask email addresses
  maskEmail(email: string): string {
    if (!email) return 'Anonymous';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 3) return name + '***@' + domain;
    return name.substring(0, 3) + '***@' + domain;
  }

  getZoneColor(zone: string): string {
    if (zone === 'Zone A') return '#007AFF';
    if (zone === 'Zone B') return '#BF5AF2';
    if (zone === 'Zone C') return '#30D158';
    return '#FF9F0A';
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (this.page > 3) pages.push(-1);
      const start = Math.max(2, this.page - 1);
      const end = Math.min(this.totalPages - 1, this.page + 1);
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== this.totalPages) pages.push(i);
      }
      if (this.page < this.totalPages - 2) pages.push(-1);
      if (this.totalPages > 1) pages.push(this.totalPages);
    }
    return pages;
  }

  // Exports
  exportCSV() {
    const selected = this.reports.filter(r => r.selected);
    const target = selected.length > 0 ? selected : this.reports;

    const headers = ['ID', 'Road Name', 'Zone', 'Severity', 'AI Score', 'Status', 'Days Open', 'Assigned To', 'Reported Date'];
    const rows = target.map(r => [
      r.id,
      r.roadName,
      r.zone,
      r.severity,
      `${r.aiScore}%`,
      r.reportLifecycle,
      r.daysOpen,
      r.assignedTeam || 'Unassigned',
      new Date(r.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `roadsense-reports-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.success('CSV downloaded');
  }

  exportPDF() {
    const selected = this.reports.filter(r => r.selected);
    const target = selected.length > 0 ? selected : this.reports;

    const doc = new jsPDF();
    
    // Header Logo Area
    doc.setFillColor(0, 122, 255);
    doc.rect(14, 14, 10, 10, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('RI', 17, 21);

    // Header Title
    doc.setTextColor(29, 29, 31);
    doc.setFontSize(16);
    doc.text('RoadSense AI — Reports Export', 28, 22);

    // Sub-title applied filters
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 115);
    const filterInfo = `Zone: ${this.filterZone || 'All'} | Severity: ${this.filterSeverity || 'All'} | Status: ${this.filterStatus || 'All'}`;
    doc.text(`Export Date: ${new Date().toLocaleDateString()} | Filters: ${filterInfo}`, 14, 30);

    const tableData = target.map(r => [
      r.id.substring(0, 6),
      r.roadName,
      r.zone,
      r.severity.toUpperCase(),
      `${r.aiScore}%`,
      `${r.daysOpen}d`,
      r.assignedTeam || 'Unassigned',
      r.reportLifecycle.toUpperCase()
    ]);

    autoTable(doc, {
      head: [['ID', 'Road Name', 'Zone', 'Severity', 'AI Conf', 'Days Open', 'Assigned To', 'Status']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8, font: 'Helvetica' },
      headStyles: { fillColor: [0, 122, 255] }
    });

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 115);
      doc.text(`Page ${i} of ${totalPages} · Generated by RoadSense AI`, 14, doc.internal.pageSize.height - 10);
    }

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`roadsense-reports-${dateStr}.pdf`);
    this.toast.success(`PDF with ${target.length} reports exported`);
  }
}
