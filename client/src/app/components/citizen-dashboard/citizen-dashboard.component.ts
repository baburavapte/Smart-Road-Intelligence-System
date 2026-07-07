import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface CitizenReport {
  id: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  description: string;
  reportLifecycle: 'reported' | 'verified' | 'assigned' | 'in_progress' | 'fixed' | 'closed';
  assignedTeam: string;
  createdAt: string;
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
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="container small-container">
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">Citizen Portal</h1>
            <p class="page-header-subtitle">Track the status of road reports and verify municipal repair milestones</p>
          </div>
        </header>

        <!-- Dynamic User Welcome Profile Banner (Only if reports found) -->
        <div class="welcome-card glass-panel animate-fade-in-up" *ngIf="hasSearched && !loading && reports.length > 0">
          <div class="profile-row">
            <div class="profile-avatar">
              {{ (reports[0]?.reporterName?.substring(0, 2) || 'CI').toUpperCase() }}
            </div>
            <div class="profile-text">
              <h2>Welcome back, {{ reports[0]?.reporterName || 'Citizen' }}</h2>
              <p>You have submitted {{ reports.length }} municipal {{ reports.length === 1 ? 'report' : 'reports' }} linked to <strong style="color: var(--primary);">{{ searchedEmail }}</strong></p>
            </div>
          </div>
        </div>

        <!-- Email Lookup Bar -->
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
                class="email-input"
                (keyup.enter)="onSearch()"
                aria-label="Email address"
              />
            </div>
            <button class="btn-primary btn-lookup" (click)="onSearch()" [disabled]="loading">
              <span *ngIf="loading" class="spinner-inline"></span>
              {{ loading ? 'Searching...' : 'Track My Reports' }}
            </button>
          </div>
        </section>

        <!-- Main Content Area -->
        <div class="results-area animate-fade-in-up" style="animation-delay: 0.1s" *ngIf="hasSearched">
          <!-- Loading State -->
          <div class="loading-state" *ngIf="loading">
            <span class="spinner" aria-hidden="true"></span>
            <p>Loading reports...</p>
          </div>

          <!-- Empty State -->
          <div class="empty-state glass-card" *ngIf="!loading && reports.length === 0">
            <div class="empty-icon" aria-hidden="true">📋</div>
            <h3>No Reports Found</h3>
            <p>No reports found for <strong>{{ searchedEmail }}</strong>. Make sure you entered the correct email address.</p>
            <a routerLink="/detect" class="btn-primary" style="margin-top: 16px;">Submit First Report</a>
          </div>

          <!-- Reports List Timeline -->
          <section class="reports-list" *ngIf="!loading && reports.length > 0" aria-label="Report list timeline">
            <div class="report-card glass-card" *ngFor="let rep of reports">
              <!-- Left Column: Detection image card preview -->
              <div class="report-img-section" *ngIf="rep.detection">
                <img [src]="rep.detection.annotatedImage" alt="AI pothole analysis screenshot" class="report-img" />
                <span class="severity-badge-overlay severity-badge" [ngClass]="'severity-' + (rep.detection.severity || 'low')">
                  {{ rep.detection.severity }}
                </span>
              </div>

              <!-- Center Column: Status lifecycle tracker and Details -->
              <div class="report-info-section">
                <div class="report-card-header">
                  <span class="report-date"><i class="ti ti-calendar" aria-hidden="true"></i> {{ formatDate(rep.createdAt) }}</span>
                  <span class="report-id">ID: {{ rep.id | slice:0:8 }}</span>
                </div>

                <p class="report-desc" *ngIf="rep.description">
                  "{{ rep.description }}"
                </p>
                <p class="report-desc no-desc" *ngIf="!rep.description">
                  No additional description provided.
                </p>

                <!-- Technical counts -->
                <div class="report-stats-grid">
                  <div class="stat-box">
                    <span class="stat-lbl">Potholes Detected</span>
                    <span class="stat-val font-accent">{{ rep.detection?.potholeCount || 0 }}</span>
                  </div>
                  <div class="stat-box">
                    <span class="stat-lbl">Assigned Team</span>
                    <span class="stat-val">{{ rep.assignedTeam || 'Waiting for assignment' }}</span>
                  </div>
                </div>

                <!-- Horizontal steps status track line -->
                <div class="lifecycle-track-bar">
                  <div
                    class="lifecycle-step"
                    *ngFor="let step of steps"
                    [class.active]="isStepActive(rep.reportLifecycle, step.id)"
                    [class.current]="rep.reportLifecycle === step.id"
                  >
                    <div class="step-dot-outer">
                      <div class="step-dot"></div>
                    </div>
                    <span class="step-lbl">{{ step.label }}</span>
                  </div>
                </div>
              </div>

              <!-- Right Column: Verification actions -->
              <div class="report-actions-section">
                <ng-container *ngIf="rep.reportLifecycle === 'fixed' || rep.reportLifecycle === 'closed'">
                  <a [routerLink]="['/repair-history', rep.id]" class="btn-primary btn-action">
                    Verify Repair Proof
                  </a>
                </ng-container>
                <ng-container *ngIf="rep.reportLifecycle !== 'fixed' && rep.reportLifecycle !== 'closed'">
                  <div class="status-banner" [ngClass]="'status-' + rep.reportLifecycle">
                    {{ getFriendlyStatus(rep.reportLifecycle) }}
                  </div>
                  <p class="status-note">Our municipal team is working on resolving this report.</p>
                </ng-container>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .welcome-card {
      padding: 24px;
      margin-bottom: 20px;
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
      background: linear-gradient(135deg, #007AFF 0%, #BF5AF2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0,122,255,0.15);
      flex-shrink: 0;
    }

    .profile-text h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .profile-text p {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .lookup-card {
      padding: 20px;
      margin-bottom: 24px;
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
      color: var(--text-secondary);
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
      margin-top: 16px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      gap: 16px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(0, 0, 0, 0.05);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Reports List */
    .reports-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .report-card {
      display: flex;
      padding: 24px;
      gap: 24px;
      align-items: stretch;
    }

    .report-img-section {
      width: 180px;
      min-height: 180px;
      border-radius: 14px;
      overflow: hidden;
      position: relative;
      border: 0.5px solid rgba(0,0,0,0.08);
      flex-shrink: 0;
    }

    .report-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .severity-badge-overlay {
      position: absolute;
      top: 10px;
      left: 10px;
      font-size: 9.5px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .report-info-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
    }

    .report-card-header {
      display: flex;
      justify-content: space-between;
      font-size: 12.5px;
      font-weight: 500;
    }

    .report-date {
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .report-id {
      color: var(--primary);
      font-family: monospace;
      font-weight: 600;
    }

    .report-desc {
      font-style: italic;
      color: var(--text-primary);
      font-size: 14px;
      line-height: 1.4;
    }

    .no-desc {
      color: var(--text-secondary);
    }

    .report-stats-grid {
      display: grid;
      grid-template-columns: 130px 1fr;
      gap: 16px;
    }

    .stat-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-lbl {
      font-size: 10px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .stat-val {
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .font-accent {
      color: var(--primary);
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
    }

    /* Lifecycle Track Line */
    .lifecycle-track-bar {
      display: flex;
      justify-content: space-between;
      position: relative;
      margin-top: 8px;
      padding: 0 4px;
    }

    .lifecycle-track-bar::before {
      content: '';
      position: absolute;
      top: 6px;
      left: 10px;
      right: 10px;
      height: 2px;
      background: rgba(0, 0, 0, 0.05);
      z-index: 1;
    }

    .lifecycle-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 2;
      position: relative;
      flex: 1;
    }

    .step-dot-outer {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 0.5px solid rgba(0, 0, 0, 0.1);
      margin-bottom: 4px;
      transition: var(--transition);
    }

    .step-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.15);
      transition: var(--transition);
    }

    .step-lbl {
      font-size: 9px;
      color: var(--text-secondary);
      text-align: center;
      font-weight: 500;
      transition: var(--transition);
    }

    .lifecycle-step.active .step-dot {
      background: var(--primary);
    }

    .lifecycle-step.active .step-dot-outer {
      border-color: var(--primary);
      box-shadow: 0 0 8px rgba(0, 122, 255, 0.2);
    }

    .lifecycle-step.active .step-lbl {
      color: var(--text-primary);
      font-weight: 600;
    }

    .lifecycle-step.current .step-dot-outer {
      background: var(--primary);
      border-color: transparent;
      box-shadow: 0 0 10px rgba(0, 122, 255, 0.4);
      animation: pulse-dot 1.5s infinite alternate;
    }

    .lifecycle-step.current .step-dot {
      background: white;
      width: 5px;
      height: 5px;
    }

    /* Right Action Section */
    .report-actions-section {
      width: 180px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      border-left: 0.5px solid rgba(0, 0, 0, 0.07);
      padding-left: 20px;
      flex-shrink: 0;
      gap: 10px;
    }

    .btn-action {
      width: 100%;
      text-align: center;
    }

    .status-banner {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      text-align: center;
      width: 100%;
      border: 0.5px solid transparent;
    }

    .status-reported { background: rgba(133,133,139,0.08); color: #85858b; border-color: rgba(133,133,139,0.15); }
    .status-verified { background: rgba(0,122,255,0.08); color: var(--primary); border-color: rgba(0,122,255,0.15); }
    .status-assigned { background: rgba(88,86,214,0.08); color: #5856D6; border-color: rgba(88,86,214,0.15); }
    .status-in_progress { background: rgba(255,159,10,0.08); color: #FF9F0A; border-color: rgba(255,159,10,0.15); }
    .status-fixed { background: rgba(48,209,88,0.08); color: var(--success); border-color: rgba(48,209,88,0.15); }
    .status-closed { background: rgba(0,0,0,0.04); color: var(--text-secondary); border-color: rgba(0,0,0,0.08); }

    .status-note {
      font-size: 10.5px;
      color: var(--text-secondary);
      text-align: center;
      line-height: 1.3;
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

    @keyframes pulse-dot {
      0% { transform: scale(1); box-shadow: 0 0 4px rgba(0, 122, 255, 0.2); }
      100% { transform: scale(1.1); box-shadow: 0 0 10px rgba(0, 122, 255, 0.5); }
    }

    /* Responsive */
    @media (max-width: 992px) {
      .report-card {
        flex-direction: column;
      }
      .report-img-section {
        width: 100%;
        height: 200px;
        min-height: unset;
      }
      .report-actions-section {
        width: 100%;
        border-left: none;
        border-top: 0.5px solid rgba(0, 0, 0, 0.07);
        padding-left: 0;
        padding-top: 16px;
      }
    }
  `]
})
export class CitizenDashboardComponent implements OnInit {
  emailInput: string = '';
  searchedEmail: string = '';
  reports: CitizenReport[] = [];
  loading: boolean = false;
  hasSearched: boolean = false;

  steps = [
    { id: 'reported', label: 'Reported' },
    { id: 'verified', label: 'Verified' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'fixed', label: 'Fixed' },
    { id: 'closed', label: 'Closed' }
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    const savedEmail = localStorage.getItem('citizenEmail');
    if (savedEmail) {
      this.emailInput = savedEmail;
      this.onSearch();
    }
  }

  onSearch(): void {
    if (!this.emailInput.trim()) return;

    this.loading = true;
    this.hasSearched = true;
    this.searchedEmail = this.emailInput.trim();
    localStorage.setItem('citizenEmail', this.searchedEmail);

    this.apiService.getCitizenReports(this.searchedEmail).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.reports = res.data;
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Failed to lookup citizen reports:', err);
      }
    });
  }

  isStepActive(currentStatus: string, stepId: string): boolean {
    const order = ['reported', 'verified', 'assigned', 'in_progress', 'fixed', 'closed'];
    const currentIndex = order.indexOf(currentStatus);
    const stepIndex = order.indexOf(stepId);
    return stepIndex <= currentIndex;
  }

  getFriendlyStatus(status: string): string {
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

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
