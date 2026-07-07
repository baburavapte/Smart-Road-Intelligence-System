import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-citizen-report',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="container small-container">
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text text-center">
            <h1 class="page-title">Submit Citizen Report</h1>
            <p class="page-header-subtitle">Link your AI detection to an official municipal maintenance request</p>
          </div>
        </header>

        <!-- Multi-Step Card Wrapper -->
        <div class="form-wizard-card glass-panel animate-fade-in-up">
          <!-- Stepper Indicator -->
          <nav class="stepper-indicator" aria-label="Submission Steps">
            <div class="step-indicator-item" [class.active]="formStep >= 1" [class.current]="formStep === 1">
              <div class="step-num">1</div>
              <span class="step-label">Location</span>
            </div>
            <div class="step-line" [class.active]="formStep >= 2"></div>
            <div class="step-indicator-item" [class.active]="formStep >= 2" [class.current]="formStep === 2">
              <div class="step-num">2</div>
              <span class="step-label">Contact</span>
            </div>
            <div class="step-line" [class.active]="formStep >= 3"></div>
            <div class="step-indicator-item" [class.active]="formStep >= 3" [class.current]="formStep === 3">
              <div class="step-num">3</div>
              <span class="step-label">Details</span>
            </div>
            <div class="step-line" [class.active]="formStep >= 4"></div>
            <div class="step-indicator-item" [class.active]="formStep >= 4" [class.current]="formStep === 4">
              <div class="step-num">4</div>
              <span class="step-label">Confirm</span>
            </div>
          </nav>

          <!-- Step 1: Location -->
          <div *ngIf="formStep === 1" class="step-content animate-fade-in">
            <h3 class="step-content-title">Verify Location</h3>
            <p class="step-content-desc">Ensure the geospatial coordinates correspond to the physical pothole location.</p>

            <div class="location-preview-box glass-card">
              <div class="maint-icon-square bg-blue-tint">
                <i class="ti ti-map-pin" aria-hidden="true"></i>
              </div>
              <div class="location-details-meta">
                <span class="location-coords" *ngIf="detection?.location?.coordinates">
                  {{ detection.location.coordinates[1].toFixed(6) }}° N, {{ detection.location.coordinates[0].toFixed(6) }}° E
                </span>
                <span class="location-coords" *ngIf="!detection?.location?.coordinates">
                  Geotag coordinates not found in upload
                </span>
                <span class="location-subtitle">Vadodara Smart City Grid System</span>
              </div>
            </div>

            <div class="action-buttons-wizard">
              <button class="btn-primary" (click)="setStep(2)" [disabled]="!detection">
                Next: Contact Details &rarr;
              </button>
              <a [routerLink]="['/results', detectionId]" class="btn-secondary">Cancel</a>
            </div>
          </div>

          <!-- Step 2: Contact Info -->
          <div *ngIf="formStep === 2" class="step-content animate-fade-in">
            <h3 class="step-content-title">Reporter Info</h3>
            <p class="step-content-desc">Submit name and contact details (email is required to receive repair timeline updates).</p>

            <div class="form-wrapper-wizard">
              <div class="form-group">
                <label for="reporterName">Your Name</label>
                <input
                  type="text"
                  id="reporterName"
                  [(ngModel)]="report.reporterName"
                  placeholder="Anonymous or Full Name"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label for="reporterEmail">Your Email *</label>
                <input
                  type="email"
                  id="reporterEmail"
                  [(ngModel)]="report.reporterEmail"
                  placeholder="name@example.com (Required for updates)"
                  class="form-input"
                  required
                  email
                  #emailCheck="ngModel"
                />
                <span class="field-error" *ngIf="emailCheck.touched && !emailCheck.valid">
                  Please enter a valid email address.
                </span>
              </div>

              <div class="form-group">
                <label for="reporterPhone">Phone Number</label>
                <input
                  type="tel"
                  id="reporterPhone"
                  [(ngModel)]="report.reporterPhone"
                  placeholder="Optional contact number"
                  class="form-input"
                />
              </div>
            </div>

            <div class="action-buttons-wizard">
              <button class="btn-primary" (click)="setStep(3)" [disabled]="!report.reporterEmail || !emailCheck.valid">
                Next: Description &rarr;
              </button>
              <button class="btn-secondary" (click)="setStep(1)">&larr; Back</button>
            </div>
          </div>

          <!-- Step 3: Details & Photo Preview -->
          <div *ngIf="formStep === 3" class="step-content animate-fade-in">
            <h3 class="step-content-title">Provide Details</h3>
            <p class="step-content-desc">Add a brief description of the road situation or context to aid the maintenance crew.</p>

            <div class="form-wrapper-wizard">
              <div class="form-group">
                <label for="description">Road Hazard Details</label>
                <textarea
                  id="description"
                  [(ngModel)]="report.description"
                  placeholder="e.g., Near the main intersection, deep pothole posing traffic hazards during water logging..."
                  rows="4"
                  class="form-textarea"
                ></textarea>
              </div>

              <!-- AI Info Summary -->
              <div class="form-info-row glass-card" *ngIf="detection">
                <div class="info-row-item">
                  <span class="info-row-lbl">Potholes Detected</span>
                  <span class="info-row-val val-blue">{{ detection.potholeCount }}</span>
                </div>
                <div class="info-row-item">
                  <span class="info-row-lbl">Severity Grade</span>
                  <span class="severity-badge-mini" [ngClass]="'severity-' + (detection.severity || 'low')">
                    {{ detection.severity }}
                  </span>
                </div>
              </div>
            </div>

            <div class="action-buttons-wizard">
              <button class="btn-primary" (click)="setStep(4)">
                Next: Confirm Report &rarr;
              </button>
              <button class="btn-secondary" (click)="setStep(2)">&larr; Back</button>
            </div>
          </div>

          <!-- Step 4: Confirmation Summary -->
          <div *ngIf="formStep === 4" class="step-content animate-fade-in">
            <h3 class="step-content-title">Verify Submission</h3>
            <p class="step-content-desc">Review your municipal report details. Once submitted, it will enter Vadodara's lifecycle queue.</p>

            <div class="confirm-summary-grid">
              <!-- Left: Image Preview -->
              <div class="confirm-preview-img-container glass-card" *ngIf="detection">
                <img [src]="detection.annotatedImage" alt="AI Pothole analysis preview" class="confirm-img">
              </div>

              <!-- Right: Metadata summary details -->
              <div class="confirm-details-meta">
                <div class="confirm-meta-item">
                  <span class="confirm-lbl">Reporter</span>
                  <span class="confirm-val">{{ report.reporterName || 'Anonymous' }}</span>
                </div>
                <div class="confirm-meta-item">
                  <span class="confirm-lbl">Email</span>
                  <span class="confirm-val">{{ report.reporterEmail }}</span>
                </div>
                <div class="confirm-meta-item" *ngIf="report.reporterPhone">
                  <span class="confirm-lbl">Phone</span>
                  <span class="confirm-val">{{ report.reporterPhone }}</span>
                </div>
                <div class="confirm-meta-item">
                  <span class="confirm-lbl">Description</span>
                  <span class="confirm-val val-desc">"{{ report.description || 'No description provided.' }}"</span>
                </div>
                <div class="confirm-meta-item" *ngIf="detection?.location?.coordinates">
                  <span class="confirm-lbl">Location</span>
                  <span class="confirm-val">{{ detection.location.coordinates[1].toFixed(5) }}, {{ detection.location.coordinates[0].toFixed(5) }}</span>
                </div>
              </div>
            </div>

            <div class="action-buttons-wizard">
              <button class="btn-primary" (click)="onSubmit()" [disabled]="submitting">
                <span *ngIf="submitting" class="spinner-inline"></span>
                {{ submitting ? 'Submitting...' : 'Submit Official Report' }}
              </button>
              <button class="btn-secondary" (click)="setStep(3)" [disabled]="submitting">&larr; Back</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-center {
      text-align: center;
    }

    .page-header-text {
      width: 100%;
      margin-bottom: 8px;
    }

    /* Stepper Form Wizard Styling */
    .form-wizard-card {
      max-width: 640px;
      margin: 0 auto;
      padding: 32px 40px;
    }

    /* Stepper indicator icons */
    .stepper-indicator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 36px;
      padding: 0 4px;
    }

    .step-indicator-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      position: relative;
      z-index: 10;
    }

    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.05);
      border: 0.5px solid rgba(0, 0, 0, 0.12);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition);
    }

    .step-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
      transition: var(--transition);
    }

    .step-line {
      flex: 1;
      height: 2px;
      background: rgba(0, 0, 0, 0.05);
      margin: 0 8px;
      margin-bottom: 20px;
      transition: var(--transition);
    }

    /* Active & Current step states */
    .step-indicator-item.active .step-num {
      background: rgba(0, 122, 255, 0.08);
      border-color: var(--primary);
      color: var(--primary);
    }

    .step-indicator-item.active .step-label {
      color: var(--text-primary);
      font-weight: 600;
    }

    .step-indicator-item.current .step-num {
      background: var(--primary);
      color: white;
      border-color: transparent;
      box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);
    }

    .step-line.active {
      background: var(--primary);
    }

    /* Stepper Content */
    .step-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .step-content-title {
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .step-content-desc {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.4;
      margin-bottom: 8px;
    }

    /* Form specific layouts */
    .form-wrapper-wizard {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .field-error {
      font-size: 11.5px;
      color: var(--danger);
      margin-top: 2px;
      font-weight: 500;
    }

    /* Location Panel */
    .location-preview-box {
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(0, 122, 255, 0.03);
      border: 0.5px solid rgba(0, 122, 255, 0.12);
    }

    .maint-icon-square {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .bg-blue-tint {
      background: rgba(0, 122, 255, 0.08);
      color: var(--primary);
    }

    .location-details-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .location-coords {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .location-subtitle {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .form-info-row {
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.02);
    }

    .info-row-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-row-lbl {
      font-size: 11px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-row-val {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 600;
    }

    .val-blue {
      color: var(--primary);
    }

    .severity-badge-mini {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 8px;
      margin-top: 2px;
    }

    /* Action triggers */
    .action-buttons-wizard {
      display: flex;
      flex-direction: row-reverse;
      justify-content: flex-start;
      gap: 12px;
      margin-top: 16px;
    }

    /* Step 4 confirmation details */
    .confirm-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 20px;
      align-items: start;
    }

    .confirm-preview-img-container {
      width: 100%;
      height: 180px;
      border-radius: 14px;
      overflow: hidden;
      border: 0.5px solid rgba(0, 0, 0, 0.08);
    }

    .confirm-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .confirm-details-meta {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .confirm-meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      border-bottom: 0.5px solid rgba(0, 0, 0, 0.05);
      padding-bottom: 6px;
    }
    .confirm-meta-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .confirm-lbl {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .confirm-val {
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .val-desc {
      font-style: italic;
      color: var(--text-primary);
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

    @media (max-width: 600px) {
      .form-wizard-card {
        padding: 24px 20px;
      }
      .confirm-summary-grid {
        grid-template-columns: 1fr;
      }
      .confirm-preview-img-container {
        height: 220px;
      }
    }
  `]
})
export class CitizenReportComponent implements OnInit {
  detectionId: string = '';
  detection: any = null;
  submitting: boolean = false;
  formStep: number = 1; // Wizard active step

  report = {
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
    description: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.detectionId = params.get('detectionId') || '';
      if (this.detectionId) {
        this.loadDetection();
      } else {
        this.router.navigate(['/detect']);
      }
    });
  }

  loadDetection(): void {
    this.apiService.getDetection(this.detectionId).subscribe({
      next: (res) => {
        if (res.success && res.detection) {
          this.detection = res.detection;
          const base = environment.flaskUrl;
          if (this.detection.annotatedImage && !this.detection.annotatedImage.startsWith('http')) {
            this.detection.annotatedImage = `${base}/results/${this.detection.annotatedImage}`;
          }
        }
      },
      error: (err) => {
        console.error('Failed to load detection details:', err);
        this.router.navigate(['/detect']);
      }
    });
  }

  // Set the wizard step
  setStep(step: number): void {
    if (step < 1 || step > 4) return;
    this.formStep = step;
  }

  onSubmit(): void {
    this.submitting = true;
    this.apiService.submitCitizenReport({
      detectionId: this.detectionId,
      ...this.report
    }).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          if (this.report.reporterEmail) {
            localStorage.setItem('citizenEmail', this.report.reporterEmail);
          }
          this.router.navigate(['/citizen-dashboard']);
        }
      },
      error: (err) => {
        this.submitting = false;
        console.error('Failed to submit citizen report:', err);
      }
    });
  }
}
