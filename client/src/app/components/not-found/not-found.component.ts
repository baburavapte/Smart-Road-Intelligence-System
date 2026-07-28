import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found-page">
      <div class="not-found-card glass-card">
        <div class="not-found-code">404</div>
        <h1 class="not-found-title">Page not found</h1>
        <p class="not-found-message">
          The page you are looking for doesn't exist
          or you don't have permission to view it.
        </p>
        <div class="not-found-actions">
          <a routerLink="/admin/dashboard" class="btn-primary">
            <i class="ti ti-layout-dashboard" aria-hidden="true"></i>
            Go to Dashboard
          </a>
          <button class="btn-ghost" (click)="goBack()">
            <i class="ti ti-arrow-left" aria-hidden="true"></i>
            Go Back
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F5F5F7;
      padding: 24px;
    }
    .not-found-card {
      max-width: 420px;
      width: 100%;
      text-align: center;
      padding: 48px 32px;
      background: rgba(255, 255, 255, 0.68);
      backdrop-filter: blur(28px);
      border: 0.5px solid rgba(255, 255, 255, 0.9);
      border-radius: 20px;
    }
    .not-found-code {
      font-size: 80px;
      font-weight: 700;
      color: #007AFF;
      line-height: 1;
      font-family: 'Outfit', sans-serif;
      letter-spacing: -3px;
      margin-bottom: 16px;
    }
    .not-found-title {
      font-size: 22px;
      font-weight: 600;
      color: #1D1D1F;
      margin: 0 0 10px;
      font-family: 'Outfit', sans-serif;
    }
    .not-found-message {
      font-size: 14px;
      color: #6E6E73;
      margin: 0 0 28px;
      line-height: 1.6;
    }
    .not-found-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  `]
})
export class NotFoundComponent {
  constructor(private location: Location) {}

  goBack() {
    this.location.back();
  }
}
