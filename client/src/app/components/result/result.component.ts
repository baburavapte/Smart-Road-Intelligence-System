import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ApiService, Detection } from '../../services/api.service';

@Component({
    selector: 'app-result',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="page-container container">
      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state">
        <span class="spinner" aria-hidden="true"></span>
        <h2>Loading Results...</h2>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-state glass-card">
        <div class="error-icon" aria-hidden="true">⚠️</div>
        <h2>Error Loading Results</h2>
        <p>{{ error }}</p>
        <button class="btn-primary" routerLink="/detect">Try Another Image</button>
      </div>

      <!-- Result Content -->
      <div *ngIf="!loading && !error && detection" class="result-content animate-fade-in-up">
        
        <header class="result-header">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <a routerLink="/history">Detections</a>
            <span class="divider">/</span>
            <span class="current">Analysis {{ detection.id | slice:0:8 }}</span>
          </nav>
          
          <div class="actions-row-btn">
            <a [routerLink]="['/citizen-report', detection.id]" class="btn-primary">
              <i class="ti ti-flag" aria-hidden="true"></i> File Official Report
            </a>
            <a routerLink="/detect" class="btn-secondary">
              <i class="ti ti-plus" aria-hidden="true"></i> New Run
            </a>
            <button class="btn-delete-record btn-secondary" (click)="deleteResult()" aria-label="Delete analysis record">
              <i class="ti ti-trash" aria-hidden="true"></i> Delete
            </button>
          </div>
        </header>

        <div class="dashboard-grid">
          <!-- Main Image Viewer -->
          <main class="main-viewer glass-card">
            <div class="viewer-tabs-bar">
              <div class="segmented-control-viewer">
                <button 
                  [class.active]="viewMode === 'annotated'" 
                  (click)="viewMode = 'annotated'"
                >
                  Annotated Output
                </button>
                <button 
                  [class.active]="viewMode === 'original'" 
                  (click)="viewMode = 'original'"
                >
                  Original Input
                </button>
              </div>
            </div>
            
            <div class="image-wrapper">
              <img 
                [src]="viewMode === 'annotated' ? detection.annotatedImage : detection.originalImage" 
                alt="AI road detection visualization output"
              >
            </div>
          </main>

          <!-- Side Panel / Stats -->
          <aside class="stats-panel-col">
            <!-- Summary card details -->
            <div class="summary-card glass-card">
              <div class="summary-header">
                <h3>Analysis Summary</h3>
                <span class="severity-badge" [ngClass]="'severity-' + (detection.severity || 'low')">
                  {{ detection.severity }}
                </span>
              </div>
              
              <div class="summary-stat-box">
                <span class="stat-number font-outfit">{{ detection.potholeCount }}</span>
                <span class="stat-label">Potholes Detected</span>
              </div>
              
              <div class="meta-info-list">
                <div class="meta-item">
                  <span class="meta-key">Filename</span>
                  <span class="meta-val" [title]="detection.originalFilename">{{ truncateFilename(detection.originalFilename) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-key">Analyzed On</span>
                  <span class="meta-val">{{ formatDate(detection.createdAt) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-key">Resolution</span>
                  <span class="meta-val">{{ detection.imageDimensions.width }} × {{ detection.imageDimensions.height }} px</span>
                </div>
              </div>
            </div>

            <!-- Bounding boxes confidence tags list -->
            <div class="detections-list glass-card">
              <h3>Confidence Matrix</h3>
              
              <div class="empty-state-list" *ngIf="detection.detections.length === 0">
                <div class="clear-road-icon" aria-hidden="true">🟢</div>
                <p>No pavement defects found. The road segment appears clear.</p>
              </div>

              <div class="box-list" *ngIf="detection.detections.length > 0">
                <div class="box-item" *ngFor="let m of detection.detections; let i = index">
                  <div class="box-header">
                    <span class="box-id"><i class="ti ti-scan" aria-hidden="true"></i> #{{ i + 1 }} {{ m.className }}</span>
                    <span class="confidence" [class.high]="m.confidence > 0.8" [class.med]="m.confidence <= 0.8 && m.confidence > 0.5" [class.low]="m.confidence <= 0.5">
                      {{ (m.confidence * 100) | number:'1.0-0' }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  `,
    styles: [`
      .loading-state, .error-state {
        text-align: center;
        padding: 80px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }

      .spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgba(0, 0, 0, 0.05);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .error-state h2 {
        font-family: 'Outfit', sans-serif;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .error-icon {
        font-size: 36px;
      }

      .error-state p {
        color: var(--text-secondary);
        font-size: 13.5px;
        max-width: 400px;
        line-height: 1.4;
      }

      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        flex-wrap: wrap;
        gap: 16px;
      }

      /* Breadcrumbs style */
      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 18px;
        font-weight: 600;
      }

      .breadcrumb a {
        color: var(--text-secondary);
        text-decoration: none;
        transition: var(--transition);
      }

      .breadcrumb a:hover {
        color: var(--primary);
      }

      .breadcrumb .divider {
        color: var(--text-secondary);
        font-weight: 400;
      }

      .breadcrumb .current {
        color: var(--text-primary);
        font-family: 'Outfit', sans-serif;
      }

      .actions-row-btn {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .btn-delete-record {
        border-color: rgba(255, 69, 58, 0.2) !important;
        color: #d70015 !important;
      }
      .btn-delete-record:hover {
        background: rgba(255, 69, 58, 0.05) !important;
        border-color: rgba(255, 69, 58, 0.3) !important;
      }

      /* Grid */
      .dashboard-grid {
        display: grid;
        grid-template-columns: 2.3fr 1fr;
        gap: 24px;
        align-items: start;
      }

      .main-viewer {
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .viewer-tabs-bar {
        padding: 12px;
        border-bottom: 0.5px solid var(--border-tint);
        background: rgba(0, 0, 0, 0.01);
        display: flex;
        justify-content: center;
      }

      /* Segmented tabs control */
      .segmented-control-viewer {
        display: flex;
        background: rgba(0, 0, 0, 0.04);
        padding: 2px;
        border-radius: 16px;
        width: 100%;
        max-width: 320px;
      }

      .segmented-control-viewer button {
        flex: 1;
        border: none;
        background: transparent;
        padding: 6px 12px;
        border-radius: 14px;
        font-family: inherit;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: var(--transition);
      }

      .segmented-control-viewer button.active {
        background: white;
        color: var(--primary);
        box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.04);
        font-weight: 600;
      }

      .image-wrapper {
        position: relative;
        background: #eef2f5;
        min-height: 480px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .image-wrapper img {
        max-height: 60vh;
        object-fit: contain;
        border-radius: 14px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      }

      /* Stats Side panel */
      .stats-panel-col {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .summary-card, .detections-list {
        padding: 24px;
      }

      .summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .summary-header h3 {
        font-family: 'Outfit', sans-serif;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .summary-stat-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0, 122, 255, 0.03);
        border: 0.5px solid rgba(0, 122, 255, 0.12);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 16px;
      }

      .stat-number {
        font-size: 36px;
        font-weight: 600;
        color: var(--primary);
        line-height: 1;
        margin-bottom: 2px;
      }

      .stat-label {
        color: var(--text-secondary);
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .meta-info-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .meta-item {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        border-bottom: 0.5px solid var(--border-tint);
        padding-bottom: 6px;
      }
      .meta-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .meta-key { color: var(--text-secondary); }
      .meta-val { color: var(--text-primary); font-weight: 500; }

      .detections-list h3 {
        font-family: 'Outfit', sans-serif;
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 16px 0;
        padding-bottom: 10px;
        border-bottom: 0.5px solid var(--border-tint);
        color: var(--text-primary);
      }

      .empty-state-list {
        text-align: center;
        padding: 24px 0;
        color: var(--text-secondary);
        font-size: 13px;
      }

      .clear-road-icon {
        font-size: 24px;
        margin-bottom: 6px;
      }

      .box-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 240px;
        overflow-y: auto;
        padding-right: 4px;
      }

      .box-item {
        background: rgba(0,0,0,0.02);
        border: 0.5px solid rgba(0,0,0,0.04);
        border-radius: 10px;
        padding: 10px 14px;
      }

      .box-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .box-id {
        font-weight: 600;
        font-size: 13px;
        color: var(--text-primary);
        text-transform: capitalize;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .confidence {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 12px;
      }

      .confidence.high { color: #248a3d; background: rgba(48, 209, 88, 0.08); }
      .confidence.med { color: #b85c00; background: rgba(255, 159, 10, 0.08); }
      .confidence.low { color: #d70015; background: rgba(255, 69, 58, 0.08); }

      @media (max-width: 992px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }
      }
    `]
})
export class ResultComponent implements OnInit {
    detectionId: string | null = null;
    detection: Detection | null = null;
    loading: boolean = true;
    error: string | null = null;
    viewMode: 'annotated' | 'original' = 'annotated';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private apiService: ApiService
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.detectionId = params.get('id');
            if (this.detectionId) {
                this.loadDetection();
            } else {
                this.error = 'No detection ID provided.';
                this.loading = false;
            }
        });
    }

    loadDetection() {
        this.loading = true;
        this.error = null;

        this.apiService.getDetection(this.detectionId!).subscribe({
            next: (res) => {
                if (res.success) {
                    this.detection = res.detection;
                } else {
                    this.error = 'Failed to load detection data.';
                }
                this.loading = false;
            },
            error: (err) => {
                this.error = err.error?.error || 'Detection not found. It might have been deleted.';
                this.loading = false;
            }
        });
    }

    deleteResult() {
        if (confirm('Are you sure you want to delete this detection record?')) {
            this.apiService.deleteDetection(this.detectionId!).subscribe({
                next: () => {
                    this.router.navigate(['/history']);
                },
                error: (err) => {
                    alert('Failed to delete: ' + (err.error?.error || err.message));
                }
            });
        }
    }

    formatDate(dateStr: string): string {
        try {
            return new Date(dateStr).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '—';
        }
    }

    truncateFilename(name: string): string {
        if (!name) return 'Unknown';
        return name.length > 20 ? name.substring(0, 17) + '...' : name;
    }
}
