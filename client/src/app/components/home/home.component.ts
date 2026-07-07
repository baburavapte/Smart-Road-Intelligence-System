import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterLink],
    template: `
    <div class="page-container flex-col-center">
      <section class="hero animate-fade-in-up">
        <div class="container hero-inner text-center">
          <p class="eyebrow">AI Road Intelligence</p>
          <h1 class="hero-title">Detect potholes.<br>Track repairs.</h1>
          <p class="lead">
            Upload road images for instant YOLOv8 detection, severity scoring,
            and geospatial mapping integrated with municipal work orders.
          </p>
          <div class="hero-actions">
            <a routerLink="/detect" class="btn-primary btn-lg">Start Detection</a>
            <a routerLink="/dashboard" class="btn-secondary btn-lg">View Map Dashboard</a>
          </div>
        </div>
      </section>

      <section class="features container animate-fade-in-up" style="animation-delay: 0.1s" aria-label="Core Features">
        <div class="feature glass-card">
          <div class="feature-icon bg-blue-tint"><i class="ti ti-scan"></i></div>
          <h3>AI Detection</h3>
          <p>YOLOv8 bounding boxes with real-time confidence scores on every road upload.</p>
        </div>
        <div class="feature glass-card">
          <div class="feature-icon bg-warning-tint"><i class="ti ti-chart-bar"></i></div>
          <h3>Severity Index</h3>
          <p>Automated risk classification computed via MCDA and road degradation density.</p>
        </div>
        <div class="feature glass-card">
          <div class="feature-icon bg-forecast-tint"><i class="ti ti-git-fork"></i></div>
          <h3>Lifecycle Workflow</h3>
          <p>Official citizen reports, contractor work orders, and visual repair verification.</p>
        </div>
      </section>
    </div>
  `,
    styles: [`
      .flex-col-center {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: calc(100vh - 120px);
        padding-top: 60px;
        padding-bottom: 60px;
      }

      .hero {
        padding: 24px 0 48px;
        text-align: center;
      }

      .hero-inner {
        max-width: 580px;
        margin: 0 auto;
      }

      .eyebrow {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        color: var(--primary);
        margin-bottom: 16px;
      }

      .hero-title {
        font-family: 'Outfit', sans-serif;
        font-size: clamp(2.25rem, 6vw, 3.25rem);
        font-weight: 700;
        letter-spacing: -1.2px;
        line-height: 1.1;
        margin-bottom: 16px;
        color: var(--text-primary);
      }

      .lead {
        color: var(--text-secondary);
        font-size: 15px;
        line-height: 1.55;
        margin-bottom: 32px;
      }

      .hero-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      }

      .btn-lg {
        padding: 10px 24px;
        font-size: 14px;
        border-radius: 24px;
      }

      .features {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin-top: 16px;
        padding-bottom: 40px;
      }

      .feature {
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.02) !important;
      }

      .feature-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }

      .bg-blue-tint { background: rgba(0, 122, 255, 0.08); color: var(--primary); }
      .bg-warning-tint { background: rgba(255, 159, 10, 0.08); color: #ff9f0a; }
      .bg-forecast-tint { background: rgba(191, 90, 242, 0.08); color: var(--forecast); }

      .feature h3 {
        font-family: 'Outfit', sans-serif;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .feature p {
        font-size: 13.5px;
        color: var(--text-secondary);
        line-height: 1.45;
      }

      @media (max-width: 768px) {
        .features {
          grid-template-columns: 1fr;
        }
        .hero {
          padding: 16px 0;
        }
      }
    `]
})
export class HomeComponent { }
