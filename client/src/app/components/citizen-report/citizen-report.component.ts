import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ZoneService } from '../../services/zone.service';
import { CameraCaptureComponent } from '../shared/camera-capture.component';
import { MapPickerComponent } from '../shared/map-picker.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-citizen-report',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CameraCaptureComponent, MapPickerComponent, StatusBadgeComponent],
  template: `
    <div class="page-container flex-page">
      <div class="container small-container">
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text text-center" style="width: 100%;">
            <h1 class="page-title">Submit Road Report</h1>
            <p class="page-header-subtitle">Report road distress to the Vadodara Municipal Corporation</p>
          </div>
        </header>

        <!-- Stepper Indicator -->
        <div class="form-wizard-card glass-panel animate-fade-in-up">
          <nav class="stepper-indicator" aria-label="Submission Steps" style="margin-bottom: 24px;">
            <div class="step-indicator-item" [class.active]="formStep >= 1" [class.current]="formStep === 1">
              <div class="step-num">1</div>
              <span class="step-label">Location</span>
            </div>
            <div class="step-line" [class.active]="formStep >= 2"></div>
            <div class="step-indicator-item" [class.active]="formStep >= 2" [class.current]="formStep === 2">
              <div class="step-num">2</div>
              <span class="step-label">Photo</span>
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
            <h3 class="step-title">Step 1: Pothole Location</h3>
            <p class="step-desc">Drag the pin on the map or use GPS to define the pothole location.</p>
            
            <app-map-picker (locationPicked)="onLocationPicked($event)"></app-map-picker>

            <div *ngIf="coords" style="margin-top: 12px; padding: 12px; border-radius: 8px; background: rgba(0,0,0,0.02); font-weight: 500; font-size: 13px;">
              <span *ngIf="zone !== 'Unknown'" style="color: var(--color-success); display: flex; align-items: center; gap: 6px;">
                <i class="ti ti-circle-check-filled"></i> You are in {{ zone }} ({{ zoneLabel }})
              </span>
              <span *ngIf="zone === 'Unknown'" style="color: var(--color-danger); display: flex; align-items: center; gap: 6px;">
                <i class="ti ti-circle-x-filled"></i> Location is outside Vadodara city limits
              </span>
            </div>

            <div class="wizard-actions" style="margin-top: 24px;">
              <button class="btn-primary" (click)="nextStep()" [disabled]="!coords || zone === 'Unknown'">
                Next: Take Photo <i class="ti ti-arrow-right"></i>
              </button>
            </div>
          </div>

          <!-- Step 2: Photo -->
          <div *ngIf="formStep === 2" class="step-content animate-fade-in">
            <h3 class="step-title">Step 2: Upload or Capture Photo</h3>
            <p class="step-desc">Upload a picture of the road damage. Desktop users can use webcam; mobile users can open camera directly.</p>
            
            <app-camera-capture (imageSelected)="onImageSelected($event)"></app-camera-capture>

            <div class="wizard-actions" style="margin-top: 24px;">
              <button class="btn-secondary" (click)="prevStep()"><i class="ti ti-arrow-left"></i> Back</button>
              <button class="btn-primary" (click)="nextStep()" [disabled]="!selectedImageFile">
                Next: Add Details <i class="ti ti-arrow-right"></i>
              </button>
            </div>
          </div>

          <!-- Step 3: Details -->
          <div *ngIf="formStep === 3" class="step-content animate-fade-in">
            <h3 class="step-title">Step 3: Incident Details</h3>
            <p class="step-desc">Provide severity estimation and description to help repair crews prioritize.</p>

            <div class="form-grid">
              <div class="form-group">
                <label class="card-label">Estimated Severity</label>
                <div class="pill-selector">
                  <button type="button" class="pill-btn" [class.selected]="severity === 'low'" (click)="severity = 'low'">Minor</button>
                  <button type="button" class="pill-btn" [class.selected]="severity === 'medium'" (click)="severity = 'medium'">Moderate</button>
                  <button type="button" class="pill-btn" [class.selected]="severity === 'critical'" (click)="severity = 'critical'">Severe</button>
                </div>
              </div>

              <div class="form-group">
                <div class="label-row">
                  <label for="desc" class="card-label">Description (Optional)</label>
                  <span class="char-counter" [class.text-danger]="description.length > 280">{{ description.length }}/300</span>
                </div>
                <textarea id="desc" maxlength="300" [(ngModel)]="description" 
                          placeholder="Describe the road issue..." class="form-textarea glass-input"></textarea>
              </div>

              <!-- Reporter Details with Validation -->
              <div class="form-group">
                <label class="form-label" for="reporterName">Reporter Name</label>
                <input type="text" id="reporterName" [(ngModel)]="reporterName"
                       name="reporterName" #nameInput="ngModel" required
                       class="form-input" placeholder="Enter your name">
                <div class="field-error" *ngIf="nameInput.invalid && (nameInput.dirty || nameInput.touched)">
                  <i class="ti ti-alert-circle"></i> Name is required.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="reporterEmail">Reporter Email</label>
                <input type="email" id="reporterEmail" [(ngModel)]="reporterEmail"
                       name="reporterEmail" #emailInputRef="ngModel" required pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$"
                       class="form-input" placeholder="name@example.com">
                <div class="field-error" *ngIf="emailInputRef.invalid && (emailInputRef.dirty || emailInputRef.touched)">
                  <i class="ti ti-alert-circle"></i> Enter a valid email address.
                </div>
              </div>

              <!-- Notifications checkboxes -->
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="notifyEmail" />
                  <span>Receive email status alerts (at {{ reporterEmail }})</span>
                </label>
              </div>

              <div class="form-group">
                <label class="checkbox-label" title="SMS notifications coming soon" style="opacity: 0.6; cursor: not-allowed; display: flex; align-items: center; gap: 8px;">
                  <input type="checkbox" [disabled]="true" [ngModel]="false" />
                  <span>SMS / WhatsApp (Coming Soon)</span>
                </label>
              </div>
            </div>

            <div class="wizard-actions" style="margin-top: 24px;">
              <button class="btn-secondary" (click)="prevStep()"><i class="ti ti-arrow-left"></i> Back</button>
              <button class="btn-primary" (click)="nextStep()" [disabled]="!reporterName || emailInputRef.invalid">
                Next: Confirm Report <i class="ti ti-arrow-right"></i>
              </button>
            </div>
          </div>

          <!-- Step 4: Confirm -->
          <div *ngIf="formStep === 4" class="step-content animate-fade-in">
            <h3 class="step-title">Step 4: Confirm & Submit</h3>
            <p class="step-desc">Please review your submission details. Once submitted, Vadodara Smart City AI will analyze the pothole.</p>

            <div class="summary-card glass-card">
              <div class="summary-img-row" *ngIf="selectedImagePreview">
                <img [src]="selectedImagePreview" alt="Pothole preview" class="summary-img" />
              </div>
              <div class="summary-info-rows">
                <div class="summary-row">
                  <span class="card-label">Address</span>
                  <p class="summary-val">{{ address }}</p>
                </div>
                <div class="summary-row-two-col">
                  <div class="summary-row">
                    <span class="card-label">Zone</span>
                    <p class="summary-val">{{ zone }}</p>
                  </div>
                  <div class="summary-row">
                    <span class="card-label">Severity</span>
                    <div><app-status-badge [status]="severity" type="severity"></app-status-badge></div>
                  </div>
                </div>
                <div class="summary-row" *ngIf="description">
                  <span class="card-label">Description</span>
                  <p class="summary-val">"{{ description }}"</p>
                </div>
                <div class="summary-row" *ngIf="notifyWhatsApp && reporterPhone">
                  <span class="card-label">WhatsApp Alerts</span>
                  <p class="summary-val">{{ reporterPhone }}</p>
                </div>
              </div>
            </div>

            <div class="form-group" style="margin: 20px 0;">
              <label class="checkbox-label" style="font-weight: 500;">
                <input type="checkbox" [(ngModel)]="termsAccepted" />
                <span>I confirm that this report contains accurate information regarding a road pothole.</span>
              </label>
            </div>

            <div class="error-banner animate-fade-in" *ngIf="submitError" style="margin-bottom: 16px; color: var(--color-danger); font-size: 13px;">
              <i class="ti ti-alert-triangle"></i> {{ submitError }}
            </div>

            <div class="wizard-actions">
              <button class="btn-secondary" (click)="prevStep()" [disabled]="submitting"><i class="ti ti-arrow-left"></i> Back</button>
              <button class="btn-primary" (click)="submitReport()" [disabled]="!termsAccepted || submitting">
                {{ submitting ? 'Analyzing & Saving...' : 'Submit Official Report' }}
              </button>
            </div>
          </div>

          <!-- Step 5: Success screen -->
          <div *ngIf="formStep === 5" class="step-content animate-fade-in text-center" style="padding: 40px 0;">
            <div class="success-icon-wrapper animate-scale-in">
              <i class="ti ti-circle-check-filled success-icon"></i>
            </div>
            <h2 class="section-title" style="margin-top: 20px;">Report Submitted Successfully</h2>
            <p class="step-desc" style="max-width: 480px; margin: 8px auto 24px;">
              Pothole report #{{ submittedReportId | slice:0:8 }} is verified. YOLOv8 AI Model confirmed the severity levels.
            </p>
            <div class="success-actions" style="display: flex; gap: 12px; justify-content: center;">
              <a routerLink="/citizen/dashboard" class="btn-primary">Track Repair Status</a>
              <button class="btn-secondary" (click)="resetForm()">Submit Another</button>
            </div>
          </div>

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

    .form-wizard-card {
      padding: 32px;
    }

    .stepper-indicator {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .step-indicator-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      width: 60px;
      position: relative;
    }

    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.05);
      color: var(--color-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      transition: var(--transition);
    }

    .step-indicator-item.active .step-num {
      background: var(--color-primary);
      color: white;
    }

    .step-indicator-item.current .step-num {
      background: var(--color-primary);
      color: white;
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
    }

    .step-label {
      font-size: 10px;
      font-weight: 500;
      color: var(--color-muted);
      text-transform: uppercase;
    }

    .step-indicator-item.current .step-label {
      color: var(--color-primary);
      font-weight: 600;
    }

    .step-line {
      flex: 1;
      height: 2px;
      background: rgba(0, 0, 0, 0.05);
      margin-bottom: 16px;
      transition: var(--transition);
    }

    .step-line.active {
      background: var(--color-primary);
    }

    .step-title {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .step-desc {
      font-size: 13px;
      color: var(--color-muted);
      margin-bottom: 20px;
      line-height: 1.4;
    }

    .wizard-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .char-counter {
      font-size: 11px;
      color: var(--color-muted);
    }

    .pill-selector {
      display: flex;
      gap: 10px;
    }

    .pill-btn {
      padding: 10px 20px;
      border-radius: 20px;
      border: 0.5px solid rgba(0,0,0,0.12);
      background: white;
      color: var(--color-text);
      font-weight: 500;
      font-size: 13px;
      cursor: pointer;
      transition: var(--transition);
    }

    .pill-btn:hover {
      background: rgba(0, 0, 0, 0.02);
    }

    .pill-btn.selected {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
      box-shadow: 0 2px 8px rgba(0,122,255,0.15);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      cursor: pointer;
    }

    .checkbox-label input {
      width: 16px;
      height: 16px;
    }

    .summary-card {
      padding: 20px;
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }

    @media (max-width: 600px) {
      .summary-card {
        flex-direction: column;
      }
      .summary-img-row {
        width: 100% !important;
        height: 160px !important;
      }
    }

    .summary-img-row {
      width: 180px;
      height: 140px;
      border-radius: 12px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .summary-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .summary-info-rows {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }

    .summary-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .summary-row-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .summary-val {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text);
    }

    .success-icon-wrapper {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(48, 209, 88, 0.1);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .success-icon {
      font-size: 48px;
      color: var(--color-success);
    }
  `]
})
export class CitizenReportComponent implements OnInit {
  formStep = 1;
  submitting = false;
  submitError = '';

  // Step 1: Location picker coordinates
  coords: { lat: number; lng: number } | null = null;
  address = '';
  zone = 'Zone A';
  zoneLabel = 'North-West';

  // Step 2: Camera files
  selectedImageFile: File | null = null;
  selectedImagePreview = '';

  // Step 3: Details
  severity = 'medium';
  description = '';
  notifyEmail = true;
  notifyWhatsApp = false;
  reporterName = '';
  reporterEmail = '';
  reporterPhone = '';
  termsAccepted = false;

  submittedReportId = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private zoneService: ZoneService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.reporterName = this.authService.getUserName() || 'Anonymous';
    this.reporterEmail = this.authService.getUserEmail() || '';
  }

  onLocationPicked(event: { lat: number; lng: number; address: string; zone: string }) {
    this.coords = { lat: event.lat, lng: event.lng };
    this.address = event.address;
    this.zoneService.detectZone(event.lat, event.lng).subscribe(result => {
      this.zone = result.zone;
      this.zoneLabel = result.label;
    });
  }

  onImageSelected(event: { file: File; previewUrl: string }) {
    this.selectedImageFile = event.file;
    this.selectedImagePreview = event.previewUrl;
  }

  nextStep() {
    if (this.formStep < 4) {
      this.formStep++;
    }
  }

  prevStep() {
    if (this.formStep > 1) {
      this.formStep--;
    }
  }

  setStep(step: number) {
    this.formStep = step;
  }

  submitReport() {
    if (!this.selectedImageFile || !this.coords || !this.termsAccepted) return;

    this.submitting = true;
    this.submitError = '';

    // Step 1: Upload to YOLOv8 inference detection endpoint
    this.apiService.detectPotholes(this.selectedImageFile, this.coords.lat, this.coords.lng).subscribe({
      next: (detRes) => {
        if (detRes.success && detRes.detection) {
          const detectionId = detRes.detection.id;

          // Step 2: Create official CitizenReport linked to that detection
          const reportPayload = {
            detectionId,
            reporterName: this.reporterName,
            reporterEmail: this.notifyEmail ? this.reporterEmail : '',
            reporterPhone: this.notifyWhatsApp ? this.reporterPhone : '',
            description: this.description
          };

          this.apiService.submitCitizenReport(reportPayload).subscribe({
            next: (repRes) => {
              this.submitting = false;
              if (repRes.success && repRes.report) {
                this.submittedReportId = repRes.report._id;
                this.toast.success('Pothole report submitted successfully');
                this.formStep = 5; // Success step
              } else {
                this.submitError = 'Failed to create official report record.';
              }
            },
            error: (err) => {
              this.submitting = false;
              this.submitError = err.error?.error || 'Failed to submit citizen report.';
            }
          });
        } else {
          this.submitting = false;
          this.submitError = 'AI verification service upload failed.';
        }
      },
      error: (err) => {
        this.submitting = false;
        this.submitError = err.error?.error || 'Failed to analyze photo with AI.';
      }
    });
  }

  resetForm() {
    this.formStep = 1;
    this.coords = null;
    this.address = '';
    this.selectedImageFile = null;
    this.selectedImagePreview = '';
    this.description = '';
    this.notifyWhatsApp = false;
    this.reporterPhone = '';
    this.termsAccepted = false;
    this.submittedReportId = '';
  }
}
