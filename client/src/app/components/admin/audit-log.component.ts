import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SkeletonComponent } from '../shared/skeleton.component';
import { ErrorCardComponent } from '../shared/error-card.component';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonComponent, ErrorCardComponent],
  template: `
    <div class="page-container flex-page">
      <div class="container">
        
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">System Audit Logs</h1>
            <p class="page-header-subtitle">Append-only administrative operations history</p>
          </div>
          <div class="page-header-actions">
            <select class="glass-input select-pill" [(ngModel)]="actionType" (change)="onFilterChange()">
              <option value="">All Action Types</option>
              <option value="update_lifecycle">Update Lifecycle</option>
              <option value="create_contractor">Create Contractor</option>
              <option value="edit_contractor">Edit Contractor</option>
              <option value="delete_contractor">Delete Contractor</option>
              <option value="recalculate_road_health">Recalculate Road Health</option>
            </select>

            <div class="search-box" style="display: flex; gap: 8px;">
              <input type="text" class="glass-input search-input" 
                     [(ngModel)]="search" (keyup.enter)="onSearch()"
                     placeholder="Search actor or resource ID...">
              <button class="btn-primary btn-sm" (click)="onSearch()">Search</button>
            </div>
          </div>
        </header>

        <!-- Loading Skeleton -->
        <div class="glass-card table-card" style="margin-top: 20px;" *ngIf="loading">
          <app-skeleton type="table" height="400px"></app-skeleton>
        </div>

        <!-- Error Card -->
        <div style="margin-top: 20px;" *ngIf="error">
          <app-error-card [title]="'Failed to load audit logs'" 
                           [message]="errorMessage" 
                           (retry)="loadLogs()"></app-error-card>
        </div>

        <!-- Empty State -->
        <div class="glass-card empty-state text-center" style="margin-top: 20px; padding: 48px;" *ngIf="!loading && !error && logs.length === 0">
          <i class="ti ti-history text-muted" style="font-size: 48px; margin-bottom: 12px; display: block;"></i>
          <h3>No audit logs found</h3>
          <p class="meta">Try modifying search keywords or action filter criteria.</p>
        </div>

        <!-- Audit Logs Table -->
        <div class="glass-card table-card animate-fade-in-up" style="margin-top: 20px;" *ngIf="!loading && !error && logs.length > 0">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action Type</th>
                  <th>Actor</th>
                  <th>Target Resource</th>
                  <th>Target ID</th>
                  <th>IP Address</th>
                  <th>User Agent</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let log of logs; let idx = index">
                  <tr (click)="toggleDetails(idx)" style="cursor: pointer;">
                    <td class="semi-bold text-nowrap">{{ log.createdAt | date:'dd MMM yyyy HH:mm:ss' }}</td>
                    <td>
                      <span class="badge" [ngClass]="getBadgeClass(log.actionType)">
                        {{ log.actionType }}
                      </span>
                    </td>
                    <td class="bold">{{ log.actorName }}</td>
                    <td><span class="text-muted">{{ log.targetResource }}</span></td>
                    <td class="mono font-xs">{{ log.targetResourceId || '-' }}</td>
                    <td class="mono font-xs">{{ log.ipAddress }}</td>
                    <td class="text-truncate max-w-150" [title]="log.userAgent">{{ log.userAgent }}</td>
                    <td class="text-center">
                      <i class="ti" [ngClass]="expandedIdx === idx ? 'ti-chevron-up' : 'ti-chevron-down'"></i>
                    </td>
                  </tr>
                  
                  <!-- Expanded Details Row -->
                  <tr *ngIf="expandedIdx === idx" class="detail-row">
                    <td colspan="8" class="details-container">
                      <div class="details-panel glass-card">
                        <h4 class="details-title">Modification Payload Details</h4>
                        <pre class="json-payload">{{ log.changesDetails | json }}</pre>
                      </div>
                    </td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <footer class="table-footer">
            <div class="pagination-info">
              Showing Page {{ page }} of {{ pages }} ({{ totalLogs }} total logs)
            </div>
            <div class="pagination-controls">
              <button class="btn-ghost" [disabled]="page === 1" (click)="setPage(page - 1)">
                <i class="ti ti-arrow-left"></i> Previous
              </button>
              <button class="btn-ghost" [disabled]="page === pages" (click)="setPage(page + 1)">
                Next <i class="ti ti-arrow-right"></i>
              </button>
            </div>
          </footer>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .detail-row {
      background: rgba(255, 255, 255, 0.02);
    }
    .details-container {
      padding: 16px !important;
    }
    .details-panel {
      padding: 16px;
      background: rgba(0, 0, 0, 0.15) !important;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .details-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--color-primary);
    }
    .json-payload {
      font-family: monospace;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-all;
      background: rgba(0, 0, 0, 0.2);
      padding: 12px;
      border-radius: 6px;
      color: #9cdcfe;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-blue { background: rgba(0, 122, 255, 0.15); color: #007aff; }
    .badge-green { background: rgba(52, 199, 89, 0.15); color: #34c759; }
    .badge-orange { background: rgba(255, 149, 0, 0.15); color: #ff9500; }
    .badge-red { background: rgba(255, 59, 48, 0.15); color: #ff3b30; }
    .badge-purple { background: rgba(175, 82, 222, 0.15); color: #af52de; }
    .max-w-150 { max-width: 150px; }
  `]
})
export class AuditLogComponent implements OnInit {
  logs: any[] = [];
  loading = true;
  error = false;
  errorMessage = '';

  actionType = '';
  search = '';
  page = 1;
  limit = 25;
  pages = 1;
  totalLogs = 0;
  expandedIdx = -1;

  private http = inject(HttpClient);

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.loading = true;
    this.error = false;
    this.expandedIdx = -1;

    let url = `${environment.apiUrl}/audit-logs?page=${this.page}&limit=${this.limit}`;
    if (this.actionType) {
      url += `&actionType=${this.actionType}`;
    }
    if (this.search) {
      url += `&search=${encodeURIComponent(this.search)}`;
    }

    this.http.get<any>(url, { withCredentials: true }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.logs = res.data;
          this.pages = res.pagination.pages;
          this.totalLogs = res.pagination.total;
        } else {
          this.error = true;
          this.errorMessage = res.error || 'Failed to parse log files.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = true;
        this.errorMessage = err.error?.error || 'Connection to audit API gateway failed.';
      }
    });
  }

  onFilterChange() {
    this.page = 1;
    this.loadLogs();
  }

  onSearch() {
    this.page = 1;
    this.loadLogs();
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.pages) {
      this.page = page;
      this.loadLogs();
    }
  }

  toggleDetails(idx: number) {
    if (this.expandedIdx === idx) {
      this.expandedIdx = -1;
    } else {
      this.expandedIdx = idx;
    }
  }

  getBadgeClass(action: string): string {
    switch (action) {
      case 'update_lifecycle': return 'badge-blue';
      case 'create_contractor': return 'badge-green';
      case 'edit_contractor': return 'badge-orange';
      case 'delete_contractor': return 'badge-red';
      case 'recalculate_road_health': return 'badge-purple';
      default: return 'badge-blue';
    }
  }
}
