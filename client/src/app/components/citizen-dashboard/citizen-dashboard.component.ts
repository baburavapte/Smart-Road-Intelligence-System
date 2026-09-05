import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { TimelineProgressComponent } from '../shared/timeline-progress.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { KPICardComponent } from '../shared/kpi-card.component';
import { SkeletonComponent } from '../shared/skeleton.component';
import { ErrorCardComponent } from '../shared/error-card.component';
import { ToastService } from '../../services/toast.service';

interface CitizenReport {
  id: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  description: string;
  reportLifecycle: 'reported' | 'verified' | 'assigned' | 'in_progress' | 'fixed' | 'closed';
  assignedTeam: string;
  createdAt: string;
  verifiedAt?: string;
  assignedAt?: string;
  fixedAt?: string;
  closedAt?: string;
  detection: {
    id: string;
    originalImage: string;
    annotatedImage: string;
    potholeCount: number;
    severity: string;
    location: any;
  } | null;
}

@Component({
  selector: 'app-citizen-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TimelineProgressComponent, StatusBadgeComponent, KPICardComponent, SkeletonComponent, ErrorCardComponent],
  template: `
    <div class="page-container flex-page">
      <div class="container small-container">
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">Citizen Workspace</h1>
            <p class="page-header-subtitle">Track your reports, receive live status notifications, and verify fixes.</p>
          </div>
          <div class="page-header-actions">
            <a routerLink="/citizen/report" class="btn-primary">
              <i class="ti ti-plus" aria-hidden="true"></i> Submit New Report
            </a>
          </div>
        </header>

        <!-- Welcome Profile Banner -->
        <div class="welcome-card glass-panel animate-fade-in-up" *ngIf="citizenName">
          <div class="profile-row">
            <div class="profile-avatar">
              {{ citizenInitials }}
            </div>
            <div class="profile-text">
              <h2>Hello, {{ citizenName }}</h2>
              <p>Registered Citizen · Citizen Account Ward 4</p>
            </div>
          </div>
        </div>

        <!-- In-app Notifications Bell alerts -->
        <section class="notifications-section glass-card animate-fade-in-up" *ngIf="notifications.length > 0">
          <div class="section-header-row">
            <h3 class="card-title"><i class="ti ti-bell-ringing" aria-hidden="true"></i> Live Ticket Updates</h3>
            <button class="btn-ghost btn-sm" (click)="clearNotifications()">Dismiss All</button>
          </div>
          <div class="notif-list">
            <div class="notif-item" *ngFor="let n of notifications">
              <div class="notif-dot"></div>
              <span class="notif-msg">{{ n.message }}</span>
              <span class="notif-time">{{ n.createdAt | date:'shortTime' }}</span>
            </div>
          </div>
        </section>

        <!-- Search Lookup card -->
        <section class="lookup-card glass-card animate-fade-in-up" style="animation-delay: 0.05s" aria-label="Track reported potholes">
          <div class="lookup-form">
            <div class="input-wrapper">
              <span class="input-icon" aria-hidden="true">
                <i class="ti ti-mail"></i>
              </span>
              <input
                type="email"
                [(ngModel)]="emailInput"
                placeholder="Enter email used to submit reports"
                class="email-input glass-input"
                (keyup.enter)="onSearch()"
                aria-label="Email address"
              />
            </div>
            <button class="btn-primary btn-lookup" (click)="onSearch()" [disabled]="loading">
              {{ loading ? 'Searching...' : 'Track Reports' }}
            </button>
          </div>
        </section>

        <!-- Main Content Area -->
        <div class="results-area animate-fade-in-up" style="animation-delay: 0.1s">

          <!-- Loading State -->
          <div *ngIf="loading" class="flex-col" style="gap: 16px; margin-top: 16px;">
            <app-skeleton type="card" *ngFor="let i of [1,2]"></app-skeleton>
          </div>

          <!-- Error State -->
          <app-error-card *ngIf="!loading && error" (retry)="loadReportsForEmail(searchedEmail)"></app-error-card>

          <!-- Empty State -->
          <div class="empty-state glass-card text-center" *ngIf="!loading && !error && reports.length === 0">
            <div class="empty-icon" aria-hidden="true">
              <i class="ti ti-clipboard-off" style="font-size: 48px; color: var(--color-muted);"></i>
            </div>
            <h3>No Reports Found</h3>
            <p>You haven't submitted any pothole reports under the email: <strong>{{ emailInput }}</strong>.</p>
            <a routerLink="/citizen/report" class="btn-primary" style="margin-top: 16px;">Submit Your First Report</a>
          </div>

          <!-- Reports List Timeline -->
          <section class="reports-list" *ngIf="!loading && reports.length > 0" aria-label="Report list timeline">
            <div class="report-wrapper" *ngFor="let rep of reports">
              <div class="report-card glass-card" (click)="toggleExpand(rep.id)">
                <!-- Left Column: Image -->
                <div class="report-img-section" *ngIf="rep.detection">
                  <img [src]="rep.detection.annotatedImage" alt="AI pothole analysis screenshot" class="report-img" />
                  <app-status-badge [status]="rep.detection.severity" type="severity" class="severity-badge-overlay"></app-status-badge>
                </div>

                <!-- Center Column: Details -->
                <div class="report-info-section">
                  <div class="report-card-header">
                    <span class="report-date"><i class="ti ti-calendar" aria-hidden="true"></i> {{ rep.createdAt | date:'mediumDate' }}</span>
                    <span class="report-id">ID: #{{ rep.id | slice:0:8 }}</span>
                  </div>

                  <h3 class="road-name-title">{{ rep.detection?.location?.coordinates ? 'Road coordinates selected' : 'Vadodara Main Road' }}</h3>
                  
                  <p class="report-desc" *ngIf="rep.description">
                    "{{ rep.description }}"
                  </p>
                  
                  <!-- Step Timeline Bar -->
                  <app-timeline-progress [activeStep]="rep.reportLifecycle"></app-timeline-progress>
                </div>

                <!-- Right Column: Status info -->
                <div class="report-actions-section">
                  <app-status-badge [status]="rep.reportLifecycle" type="lifecycle"></app-status-badge>
                  <p class="status-note" style="margin-top: 12px; font-size: 11px; text-align: center; color: var(--color-muted);">
                    Click to view details & crew notes
                  </p>
                </div>
              </div>

              <!-- Expanded Details Panel -->
              <div class="expanded-details glass-card animate-fade-in" *ngIf="expandedReportId === rep.id">
                <h4 class="section-title" style="font-size: 14px; margin-bottom: 12px;">Timeline Tracking Details</h4>
                <div class="detail-timeline-flow">
                  
                  <div class="flow-step" [class.done]="true">
                    <div class="flow-marker"></div>
                    <div class="flow-text">
                      <h5>Submitted</h5>
                      <p class="flow-date">{{ rep.createdAt | date:'medium' }}</p>
                      <p class="flow-note">Citizen ticket received and geocoded via platform.</p>
                    </div>
                  </div>

                  <div class="flow-step" [class.done]="hasStagePassed(rep.reportLifecycle, 'verified')">
                    <div class="flow-marker"></div>
                    <div class="flow-text">
                      <h5>AI Verified</h5>
                      <p class="flow-date" *ngIf="rep.verifiedAt">{{ rep.verifiedAt | date:'medium' }}</p>
                      <p class="flow-note">AI Inference model validated road damages and computed severity weighting.</p>
                    </div>
                  </div>

                  <div class="flow-step" [class.done]="hasStagePassed(rep.reportLifecycle, 'assigned')">
                    <div class="flow-marker"></div>
                    <div class="flow-text">
                      <h5>Assigned</h5>
                      <p class="flow-date" *ngIf="rep.assignedAt">{{ rep.assignedAt | date:'medium' }}</p>
                      <p class="flow-note">Assigned to: <strong>{{ rep.assignedTeam || 'VMC Maintenance Crew' }}</strong></p>
                    </div>
                  </div>

                  <div class="flow-step" [class.done]="hasStagePassed(rep.reportLifecycle, 'in_progress')">
                    <div class="flow-marker"></div>
                    <div class="flow-text">
                      <h5>In Progress</h5>
                      <p class="flow-note">Crew scheduled on-site repairs. Materials and machinery dispatched.</p>
                    </div>
                  </div>

                  <div class="flow-step" [class.done]="hasStagePassed(rep.reportLifecycle, 'fixed')">
                    <div class="flow-marker"></div>
                    <div class="flow-text">
                      <h5>Fixed</h5>
                      <p class="flow-date" *ngIf="rep.fixedAt">{{ rep.fixedAt | date:'medium' }}</p>
                      <p class="flow-note">Repair completed by contractor. Verification image uploaded.</p>
                      <a *ngIf="rep.reportLifecycle === 'fixed' || rep.reportLifecycle === 'closed'" 
                         [routerLink]="['/repair-history', rep.id]" class="btn-primary btn-sm" style="display: inline-block; margin-top: 8px;">
                        Verify Repair Proof
                      </a>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .flex-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .welcome-card {
      padding: 20px;
      margin-bottom: 12px;
    }

    .profile-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .profile-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-forecast) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
    }

    .profile-text h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      margin: 0;
      font-weight: 600;
    }

    .profile-text p {
      font-size: 12px;
      color: var(--color-muted);
      margin: 2px 0 0 0;
    }

    .notifications-section {
      padding: 16px;
      border-left: 4px solid var(--color-primary);
    }

    .section-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .notif-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .notif-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      padding: 6px 0;
      border-bottom: 0.5px solid rgba(0, 0, 0, 0.04);
    }

    .notif-dot {
      width: 6px;
      height: 6px;
      background: var(--color-primary);
      border-radius: 50%;
    }

    .notif-msg {
      flex: 1;
      color: var(--color-text);
    }

    .notif-time {
      font-size: 11px;
      color: var(--color-muted);
    }

    .lookup-card {
      padding: 20px;
    }

    .lookup-form {
      display: flex;
      gap: 12px;
      max-width: 600px;
      margin: 0 auto;
    }

    .input-wrapper {
      position: relative;
      flex: 1;
    }

    .input-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      color: var(--color-muted);
      display: flex;
    }

    .email-input {
      padding-left: 40px;
      border-radius: 20px;
    }

    .btn-lookup {
      flex-shrink: 0;
    }

    .results-area {
      margin-top: 12px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 12px;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid rgba(0, 0, 0, 0.05);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .reports-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .report-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .report-card {
      display: flex;
      padding: 20px;
      gap: 20px;
      cursor: pointer;
      align-items: center;
      transition: var(--transition);
    }

    .report-card:hover {
      transform: scale(1.01);
    }

    .report-img-section {
      width: 140px;
      height: 140px;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      border: 0.5px solid rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
    }

    .report-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .severity-badge-overlay {
      position: absolute;
      top: 8px;
      left: 8px;
    }

    .report-info-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .report-card-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--color-muted);
    }

    .road-name-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text);
      margin: 2px 0;
    }

    .report-desc {
      font-size: 13px;
      color: var(--color-muted);
      line-height: 1.4;
      font-style: italic;
    }

    .report-actions-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      min-width: 110px;
    }

    .expanded-details {
      padding: 20px;
      margin-left: 20px;
      border-left: 3px solid var(--color-success);
    }

    .detail-timeline-flow {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      padding-left: 20px;
    }

    .detail-timeline-flow::before {
      content: '';
      position: absolute;
      top: 6px;
      bottom: 6px;
      left: 4px;
      width: 2px;
      background: rgba(0, 0, 0, 0.05);
    }

    .flow-step {
      position: relative;
    }

    .flow-marker {
      position: absolute;
      left: -20px;
      top: 4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ccc;
      border: 2px solid white;
    }

    .flow-step.done .flow-marker {
      background: var(--color-success);
    }

    .flow-text h5 {
      font-size: 13px;
      font-weight: 600;
      margin: 0;
      color: var(--color-text);
    }

    .flow-date {
      font-size: 10px;
      color: var(--color-muted);
      margin-top: 2px;
    }

    .flow-note {
      font-size: 12px;
      color: var(--color-muted);
      margin: 4px 0 0 0;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .report-card {
        flex-direction: column;
        align-items: stretch;
        padding: 16px;
        gap: 12px;
      }

      .report-img-section {
        width: 100%;
        height: 180px;
      }

      .report-actions-section {
        flex-direction: row;
        justify-content: flex-start;
        min-width: auto;
        gap: 12px;
      }

      .expanded-details {
        margin-left: 0;
        padding: 16px;
      }

      .lookup-form {
        flex-direction: column;
        max-width: 100%;
      }

      .btn-lookup {
        width: 100%;
      }

      .welcome-card {
        padding: 16px;
      }

      .profile-text h2 {
        font-size: 16px;
      }
    }

    @media (max-width: 480px) {
      .report-img-section {
        height: 140px;
      }

      .report-card {
        padding: 12px;
        gap: 10px;
      }

      .report-card-header {
        flex-direction: column;
        gap: 2px;
      }

      .road-name-title {
        font-size: 14px;
      }

      .notif-item {
        font-size: 12px;
      }

      .detail-timeline-flow {
        padding-left: 16px;
      }
    }
  `]
})
export class CitizenDashboardComponent implements OnInit {
  citizenName = '';
  citizenInitials = '';
  emailInput = '';
  searchedEmail = '';
  reports: CitizenReport[] = [];
  notifications: any[] = [];
  loading = false;
  error = false;
  expandedReportId: string | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.citizenName = this.authService.getUserName() || '';
    if (this.citizenName) {
      const parts = this.citizenName.split(' ');
      this.citizenInitials = parts.map(p => p[0]).join('').toUpperCase().substring(0, 2);
    }

    const email = this.authService.getUserEmail();
    if (email) {
      this.emailInput = email;
      this.searchedEmail = email;
      this.loadReportsForEmail(email);
      this.loadNotifications(email);
    }
  }

  onSearch() {
    if (!this.emailInput) return;
    this.searchedEmail = this.emailInput;
    this.loadReportsForEmail(this.emailInput);
  }

  toggleExpand(reportId: string) {
    this.expandedReportId = this.expandedReportId === reportId ? null : reportId;
  }

  hasStagePassed(currentLifecycle: string, stage: string): boolean {
    const order = ['reported', 'verified', 'assigned', 'in_progress', 'fixed', 'closed'];
    const currIndex = order.indexOf(currentLifecycle);
    const targetIndex = order.indexOf(stage);
    return currIndex >= targetIndex;
  }

  loadReportsForEmail(email: string) {
    this.loading = true;
    this.error = false;
    this.apiService.getCitizenReports(email).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.reports = res.data;
        }
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.toast.error('Failed to load citizen data');
        this.reports = [];
      }
    });
  }

  private loadNotifications(email: string) {
    this.apiService.getNotifications(email).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          // Keep only unread alerts for dashboard panel
          this.notifications = res.data.filter((n: any) => !n.read).slice(0, 3);
        }
      }
    });
  }

  clearNotifications() {
    const email = this.authService.getUserEmail();
    if (email) {
      this.apiService.markAllNotificationsAsRead(email).subscribe(() => {
        this.notifications = [];
      });
    }
  }
}
