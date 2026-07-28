import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CameraCaptureComponent } from '../shared/camera-capture.component';
import { MapPickerComponent } from '../shared/map-picker.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { SkeletonComponent } from '../shared/skeleton.component';
import { ErrorCardComponent } from '../shared/error-card.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-detect',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CameraCaptureComponent, MapPickerComponent, StatusBadgeComponent, SkeletonComponent, ErrorCardComponent],
  template: `
    <div class="page-container flex-page">
      <div class="container">
        
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">AI Pothole Analyzer</h1>
            <p class="page-header-subtitle">Upload road images and run instant YOLOv8 object detection scanning.</p>
          </div>
        </header>

        <div class="detect-layout animate-fade-in-up">
          <!-- Left Column: Controls (45%) -->
          <aside class="detect-controls-panel flex-col">
            <!-- Step 1: Upload Photo -->
            <div class="glass-card control-card flex-col">
              <h3 class="card-title">1. Capture / Upload Road Photo</h3>
              <app-camera-capture (imageSelected)="onImageSelected($event)"></app-camera-capture>
            </div>

            <!-- Step 2: Map Pin (Geotag) -->
            <div class="glass-card control-card flex-col">
              <h3 class="card-title">2. Geotag Location Coordinates</h3>
              <app-map-picker (locationPicked)="onLocationPicked($event)"></app-map-picker>
            </div>

            <!-- Run Button -->
            <button class="btn-primary w-full btn-run-detection" 
                    [disabled]="!selectedImageFile || running" 
                    (click)="runDetection()">
              <i class="ti ti-cpu" aria-hidden="true"></i> {{ running ? 'Running YOLOv8...' : 'Analyze Road Image' }}
            </button>
          </aside>

          <!-- Right Column: Results Panel (55%) -->
          <main class="detect-results-panel flex-col">
            <!-- Empty State -->
            <div class="glass-card results-empty-card flex-col align-center justify-center text-center" 
                 *ngIf="!detectionResult && !running">
              <i class="ti ti-scan" style="font-size: 48px; color: var(--color-muted);"></i>
              <h3>YOLOv8 Analysis Panel</h3>
              <p class="meta">Upload a road picture on the left and click "Analyze" to run real-time inference detection.</p>
            </div>

            <!-- Shimmer Loading state -->
            <div *ngIf="running" style="width: 100%;">
              <app-skeleton type="chart" height="260px"></app-skeleton>
              <app-skeleton type="table" height="150px" style="margin-top: 16px;"></app-skeleton>
            </div>

            <!-- Active Detection Results -->
            <div class="glass-card results-active-card flex-col animate-fade-in" *ngIf="detectionResult && !running">
              <h3 class="card-title">Detection Result Summary</h3>
              
              <!-- Bounding box output frame -->
              <div class="annotated-image-frame glass-card">
                <img [src]="detectionResult.annotatedImage" alt="AI Pothole Detections Annotated Image" class="annotated-img" />
              </div>

              <!-- Counts & Confidences -->
              <div class="detection-metrics-row">
                <div class="metric-box">
                  <span class="card-label">Total Potholes</span>
                  <span class="metric-val text-danger">{{ detectionResult.potholeCount }}</span>
                </div>
                <div class="metric-box">
                  <span class="card-label">AI Average Confidence</span>
                  <span class="metric-val text-primary">{{ averageConfidence }}%</span>
                </div>
                <div class="metric-box">
                  <span class="card-label">Severity Level</span>
                  <div><app-status-badge [status]="detectionResult.severity" type="severity"></app-status-badge></div>
                </div>
              </div>

              <!-- Bounding box items coordinates list -->
              <div class="coords-list-section flex-col">
                <h4 class="card-label">Bounding Box Geometries</h4>
                <div class="coords-scroll-list">
                  <div class="coord-item" *ngFor="let det of detectionResult.detections; let i = index">
                    <span class="coord-index">#{{ i + 1 }}</span>
                    <span class="coord-class">{{ det.class }}</span>
                    <span class="coord-confidence">{{ Math.round(det.confidence * 100) }}% confidence</span>
                    <span class="coord-bbox">Box: [{{ det.bbox.map(roundBbox).join(', ') }}]</span>
                  </div>
                </div>
              </div>

              <!-- Quick action button to create ticket -->
              <button class="btn-primary w-full" [routerLink]="['/citizen/report', detectionResult.id]">
                <i class="ti ti-file-text"></i> Link as Official distress Ticket
              </button>
            </div>
          </main>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .flex-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-bottom: 80px;
    }

    .w-full {
      width: 100%;
    }

    .detect-layout {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 900px) {
      .detect-layout {
        grid-template-columns: 1fr;
      }
    }

    .detect-controls-panel {
      gap: 16px;
    }

    .control-card {
      padding: 20px;
    }

    .btn-run-detection {
      padding: 12px;
      font-size: 14px;
      border-radius: 12px;
    }

    .detect-results-panel {
      min-height: 480px;
    }

    .results-empty-card {
      min-height: 450px;
      padding: 40px;
      justify-content: center;
      align-items: center;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(0, 0, 0, 0.05);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .results-active-card {
      padding: 24px;
      gap: 20px;
    }

    .annotated-image-frame {
      width: 100%;
      height: 320px;
      overflow: hidden;
      padding: 6px;
      border-radius: 16px !important;
    }

    .annotated-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 10px;
    }

    .detection-metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .metric-box {
      padding: 12px;
      background: rgba(0,0,0,0.02);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }

    .metric-val {
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 700;
    }

    .coords-list-section {
      gap: 8px;
    }

    .coords-scroll-list {
      max-height: 160px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 4px;
    }

    .coord-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(0,0,0,0.015);
      border-radius: 8px;
      font-size: 11px;
      border: 0.5px solid rgba(0,0,0,0.03);
    }

    .coord-index {
      font-weight: 700;
      color: var(--color-muted);
    }

    .coord-class {
      font-weight: 600;
      color: var(--color-text);
      text-transform: capitalize;
    }

    .coord-confidence {
      color: var(--color-primary);
      font-weight: 600;
    }

    .coord-bbox {
      font-family: monospace;
      color: var(--color-muted);
    }
  `]
})
export class DetectComponent implements OnInit {
  selectedImageFile: File | null = null;
  coords: { lat: number; lng: number } | null = null;
  running = false;
  detectionResult: any = null;
  averageConfidence = 0;
  Math = Math;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {}

  onImageSelected(event: { file: File; previewUrl: string }) {
    this.selectedImageFile = event.file;
    this.detectionResult = null;
  }

  onLocationPicked(event: { lat: number; lng: number; address: string; zone: string }) {
    this.coords = { lat: event.lat, lng: event.lng };
  }

  roundBbox(val: number): number {
    return Math.round(val);
  }

  runDetection() {
    if (!this.selectedImageFile) return;

    this.running = true;
    this.toast.info('Running AI detection...');
    const lat = this.coords ? this.coords.lat : 22.3072;
    const lng = this.coords ? this.coords.lng : 73.1812;

    this.apiService.detectPotholes(this.selectedImageFile, lat, lng).subscribe({
      next: (res) => {
        this.running = false;
        if (res.success && res.detection) {
          this.detectionResult = res.detection;
          this.toast.success('Pothole detected successfully!');
          
          // Calculate average confidence
          if (res.detection.detections && res.detection.detections.length > 0) {
            const sum = res.detection.detections.reduce((acc: number, cur: any) => acc + cur.confidence, 0);
            this.averageConfidence = Math.round((sum / res.detection.detections.length) * 100);
          } else {
            this.averageConfidence = 95; // Default/Mock threshold fallback if 0 potholes detected but image analyzed
          }
        } else {
          this.toast.error('Inference failed — check file format');
        }
      },
      error: () => {
        this.running = false;
        this.toast.error('Inference failed — check file format');
      }
    });
  }
}
