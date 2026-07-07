import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, Detection, DetectionsListResponse } from '../../services/api.service';

@Component({
    selector: 'app-history',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="page-container container">
      <!-- Header -->
      <header class="page-header animate-fade-in">
        <div class="page-header-text">
          <h1 class="page-title">Detection History</h1>
          <p class="page-header-subtitle">Review previously compiled AI pavement analyses</p>
        </div>
        <div class="page-header-actions">
          <a routerLink="/detect" class="btn-primary">
            <i class="ti ti-plus" aria-hidden="true"></i> Run New Scan
          </a>
        </div>
      </header>

      <div class="history-content animate-fade-in-up" style="animation-delay: 0.05s">
        <!-- Toolbar information -->
        <div class="toolbar glass-card" aria-label="History metrics">
          <div class="stats">
            <i class="ti ti-chart-line" aria-hidden="true"></i> Total Compiled Runs: <strong style="color: var(--primary);">{{ totalItems }}</strong>
          </div>
        </div>

        <!-- Skeleton loaders -->
        <div *ngIf="loading && detections.length === 0" class="loading-grid">
          <div class="skeleton-card glass-card" *ngFor="let i of [1,2,3,4,5,6]">
            <div class="skeleton-img skeleton"></div>
            <div class="skeleton-content">
              <div class="skeleton-line skeleton" style="width: 80%"></div>
              <div class="skeleton-line skeleton" style="width: 50%"></div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && detections.length === 0" class="empty-state glass-card">
          <div class="empty-icon" aria-hidden="true">📋</div>
          <h3>No Detections Found</h3>
          <p>You haven't run any pothole detections yet.</p>
          <a routerLink="/detect" class="btn-primary" style="margin-top: 16px;">Run First Detection</a>
        </div>

        <!-- Cards grid list -->
        <section class="history-grid" *ngIf="detections.length > 0" aria-label="Analysis runs history grid">
          <a *ngFor="let det of detections" [routerLink]="['/results', det.id]" class="history-card glass-card">
            <div class="card-img">
              <img [src]="det.annotatedImage" alt="AI Pothole analysis preview">
              <span class="bad-count count-badge" *ngIf="det.potholeCount > 0">{{ det.potholeCount }} found</span>
              <span class="good-count count-badge" *ngIf="det.potholeCount === 0">Clear</span>
            </div>
            
            <div class="card-body">
              <h4 class="card-title-item">{{ det.originalFilename | slice:0:22 }}{{ det.originalFilename.length > 22 ? '...' : '' }}</h4>
              <div class="card-meta">
                <span class="meta-time"><i class="ti ti-calendar" aria-hidden="true"></i> {{ formatDate(det.createdAt) }}</span>
                <span class="severity-badge" [ngClass]="'severity-' + (det.severity || 'low')">{{ det.severity || 'none' }}</span>
              </div>
            </div>
          </a>
        </section>

        <!-- Pagination -->
        <nav class="pagination-bar-wrapper" *ngIf="totalPages > 1" aria-label="Pagination">
          <button 
            class="btn-page" 
            [disabled]="currentPage === 1 || loading" 
            (click)="loadPage(currentPage - 1)"
          >
            &larr; Prev
          </button>
          
          <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
          
          <button 
            class="btn-page" 
            [disabled]="currentPage === totalPages || loading" 
            (click)="loadPage(currentPage + 1)"
          >
            Next &rarr;
          </button>
        </nav>
      </div>
    </div>
  `,
    styles: [`
      .history-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .toolbar {
        padding: 14px 20px;
        display: flex;
        align-items: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.02) !important;
      }

      .stats {
        color: var(--text-secondary);
        font-size: 13.5px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      /* Grid list cards */
      .history-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }

      .history-card {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 0;
        text-decoration: none;
      }

      .history-card:hover {
        transform: translateY(-2px);
      }

      .card-img {
        position: relative;
        height: 180px;
        background: #eef2f5;
        overflow: hidden;
      }

      .card-img img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s ease;
      }

      .history-card:hover .card-img img {
        transform: scale(1.04);
      }

      .count-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        color: white;
        border: 0.5px solid rgba(255,255,255,0.25);
      }

      .bad-count { background: rgba(255, 69, 58, 0.85); }
      .good-count { background: rgba(48, 209, 88, 0.85); }

      .card-body {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: rgba(255, 255, 255, 0.4);
      }

      .card-title-item {
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        font-size: 14px;
        color: var(--text-primary);
      }

      .card-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .meta-time {
        font-size: 11.5px;
        color: var(--text-secondary);
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      /* Pagination */
      .pagination-bar-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 16px;
        padding: 16px 0;
      }

      .btn-page {
        background: #fff;
        border: 0.5px solid rgba(0,0,0,0.1);
        color: var(--text-primary);
        padding: 6px 14px;
        border-radius: 14px;
        cursor: pointer;
        font-family: inherit;
        font-size: 12px;
        font-weight: 500;
        transition: var(--transition);
      }

      .btn-page:hover:not(:disabled) {
        background: rgba(0,0,0,0.02);
      }

      .btn-page:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .page-info {
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 500;
      }

      .empty-state {
        text-align: center;
        padding: 60px 20px;
      }

      .empty-icon {
        font-size: 40px;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      /* Skeletons */
      .loading-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }

      .skeleton-card {
        padding: 0;
        overflow: hidden;
      }

      .skeleton-img {
        height: 180px;
        width: 100%;
      }

      .skeleton-content {
        padding: 16px;
      }

      .skeleton-line {
        height: 14px;
        margin-bottom: 8px;
        border-radius: 4px;
      }
    `]
})
export class HistoryComponent implements OnInit {
    detections: Detection[] = [];
    loading = true;
    currentPage = 1;
    totalPages = 1;
    totalItems = 0;
    limit = 12;

    constructor(private apiService: ApiService) { }

    ngOnInit() {
        this.loadPage(1);
    }

    loadPage(page: number) {
        if (page < 1 || (this.totalPages > 0 && page > this.totalPages)) return;

        this.loading = true;
        this.currentPage = page;

        this.apiService.getDetections(page, this.limit).subscribe({
            next: (res: DetectionsListResponse) => {
                if (res.success) {
                    this.detections = res.data;
                    this.totalItems = res.pagination.total;
                    this.totalPages = res.pagination.totalPages;
                }
                this.loading = false;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            error: (err) => {
                console.error('Failed to load history:', err);
                this.loading = false;
            }
        });
    }

    formatDate(dateStr: string): string {
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
}
