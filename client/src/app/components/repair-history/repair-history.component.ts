import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-repair-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="container small-container">
        <!-- Header -->
        <div class="page-header animate-fade-in-up">
          <div class="page-header-text">
            <h1 class="page-title">Repair Transparency</h1>
            <p class="page-header-subtitle">Verify before-and-after resolution proof uploaded by municipal repair crew</p>
          </div>
        </div>

        <div class="repair-container animate-fade-in-up" style="animation-delay: 0.05s" *ngIf="record">
          <!-- Image Comparison Slider or Side-by-Side -->
          <div class="comparison-card glass-card">
            <h3 class="section-title-sub">Before & After Repair</h3>
            
            <div class="images-comparison">
              <!-- Before Image Card -->
              <div class="img-card" *ngIf="record.beforeImage">
                <span class="img-badge badge-before">Before Repair</span>
                <img [src]="record.beforeImage" alt="Pothole before repair" class="comparison-img">
              </div>
              
              <!-- After Image Card -->
              <div class="img-card">
                <span class="img-badge badge-after">After Repair</span>
                <img [src]="record.afterImage" alt="Road after repair" class="comparison-img">
              </div>
            </div>
          </div>

          <!-- Metadata & Verification -->
          <div class="details-section">
            <div class="meta-card glass-card">
              <h3 class="section-title-sub">Resolution Log</h3>
              
              <div class="log-item">
                <span class="log-label">Repair Date</span>
                <span class="log-value">{{ formatDate(record.repairDate) }}</span>
              </div>
              
              <div class="log-item">
                <span class="log-label">Repair Crew / Assigned Team</span>
                <span class="log-value">{{ record.repairTeam }}</span>
              </div>

              <div class="log-item">
                <span class="log-label">Work Log Notes</span>
                <p class="log-notes">"{{ record.repairNotes || 'Pavement resurfaced, filled structural crack, compacted, and sealed.' }}"</p>
              </div>
            </div>

            <!-- Citizen Verification Card -->
            <div class="verify-card glass-card" [class.verified-state]="record.verifiedByCitizen">
              <div class="verify-icon">
                <i *ngIf="record.verifiedByCitizen" class="ti ti-circle-check-filled" style="color: var(--success); font-size: 28px;"></i>
                <i *ngIf="!record.verifiedByCitizen" class="ti ti-clock-hour-4" style="color: var(--warning); font-size: 28px;"></i>
              </div>
              <div class="verify-body">
                <h3>Citizen Verification</h3>
                <p *ngIf="record.verifiedByCitizen">
                  This resolution has been verified and confirmed by the citizen reporter. Thank you for your feedback!
                </p>
                <p *ngIf="!record.verifiedByCitizen">
                  As the reporter of this pothole, please verify if the repair crew has resolved the issue to your satisfaction.
                </p>
                
                <button
                  class="btn-primary btn-verify"
                  *ngIf="!record.verifiedByCitizen"
                  (click)="verifyResolution()"
                  [disabled]="verifying"
                >
                  <span *ngIf="verifying" class="btn-spinner"></span>
                  Confirm &amp; Verify Repair
                </button>
              </div>
            </div>
          </div>

          <div class="back-action">
            <a routerLink="/citizen-dashboard" class="btn-secondary">
              <i class="ti ti-arrow-left"></i> Back to Tracker
            </a>
          </div>
        </div>

        <!-- Loading State -->
        <div class="loading-state glass-card" *ngIf="loading">
          <span class="spinner"></span>
          <p>Retrieving repair evidence log...</p>
        </div>

        <!-- Error State -->
        <div class="empty-state glass-card animate-fade-in-up" *ngIf="!loading && !record">
          <i class="ti ti-folder-off empty-icon-tabler"></i>
          <h3>No Repair Proof Available</h3>
          <p>The municipal repair team has not uploaded the before-and-after proof for this report yet. Please check back later.</p>
          <a routerLink="/citizen-dashboard" class="btn-secondary" style="margin-top: 16px;">
            <i class="ti ti-arrow-left"></i> Back to Tracker
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .small-container {
      max-width: 900px !important;
    }

    .repair-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-top: 24px;
    }

    .section-title-sub {
      font-family: 'Outfit', sans-serif;
      font-size: 1.15rem;
      font-weight: 600;
      margin-bottom: 18px;
      color: var(--text-primary);
      letter-spacing: -0.2px;
    }

    /* Comparison section */
    .comparison-card {
      padding: 24px;
    }

    .images-comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 576px) {
      .images-comparison {
        grid-template-columns: 1fr;
      }
    }

    .img-card {
      position: relative;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 0.5px solid rgba(0, 0, 0, 0.08);
      height: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
    }

    .comparison-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .img-card:hover .comparison-img {
      transform: scale(1.02);
    }

    .img-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      z-index: 10;
      letter-spacing: 0.4px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }

    .badge-before {
      background: rgba(255, 69, 58, 0.85);
      color: #fff;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 0.5px solid rgba(255, 255, 255, 0.2);
    }

    .badge-after {
      background: rgba(48, 209, 88, 0.85);
      color: #fff;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 0.5px solid rgba(255, 255, 255, 0.2);
    }

    /* Details Section */
    .details-section {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 24px;
    }

    @media (max-width: 768px) {
      .details-section {
        grid-template-columns: 1fr;
      }
    }

    .meta-card {
      padding: 24px;
    }

    .log-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-bottom: 16px;
      margin-bottom: 16px;
      border-bottom: 0.5px solid rgba(0, 0, 0, 0.06);
    }

    .log-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .log-label {
      font-size: 11px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .log-value {
      font-weight: 500;
      color: var(--text-primary);
      font-size: 14px;
    }

    .log-notes {
      font-style: italic;
      color: var(--text-primary);
      line-height: 1.5;
      font-size: 13.5px;
      background: rgba(0, 0, 0, 0.02);
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--primary);
    }

    /* Verification card */
    .verify-card {
      padding: 24px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .verify-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.8);
      border: 0.5px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
    }

    .verify-body h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.05rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .verify-body p {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .btn-verify {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .verified-state {
      background: rgba(48, 209, 88, 0.05) !important;
      border-color: rgba(48, 209, 88, 0.2) !important;
      box-shadow: 0 4px 20px rgba(48, 209, 88, 0.04) !important;
    }

    .verified-state .verify-icon {
      background: rgba(48, 209, 88, 0.1);
      border-color: rgba(48, 209, 88, 0.15);
    }

    .verified-state h3 {
      color: #248a3d;
    }

    .back-action {
      margin-top: 8px;
    }

    .loading-state {
      text-align: center;
      padding: 60px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 40px;
    }

    .empty-icon-tabler {
      font-size: 48px;
      color: var(--text-secondary);
      display: block;
      margin: 0 auto 16px;
      opacity: 0.7;
    }

    .empty-state h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .empty-state p {
      color: var(--text-secondary);
      font-size: 0.95rem;
      max-width: 420px;
      margin: 0 auto;
      line-height: 1.5;
    }

    .spinner {
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 3px solid rgba(0, 0, 0, 0.05);
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }

    .btn-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class RepairHistoryComponent implements OnInit {
  reportId: string = '';
  record: any = null;
  loading: boolean = false;
  verifying: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.reportId = params.get('reportId') || '';
      if (this.reportId) {
        this.loadRepairRecord();
      }
    });
  }

  loadRepairRecord(): void {
    this.loading = true;
    this.apiService.getRepairByReport(this.reportId).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.record = res.data;
        }
      },
      error: (err) => {
        this.loading = false;
        this.toast.error('Failed to load repair record');
        console.error('Failed to load repair record:', err);
      }
    });
  }

  verifyResolution(): void {
    if (!this.record) return;
    this.verifying = true;
    this.apiService.verifyRepair(this.record.id, true).subscribe({
      next: (res) => {
        this.verifying = false;
        if (res.success) {
          this.record.verifiedByCitizen = true;
          this.toast.success('Thank you for verifying the fix!');
        }
      },
      error: (err) => {
        this.verifying = false;
        this.toast.error('Failed to verify repair');
        console.error('Failed to verify repair:', err);
      }
    });
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
