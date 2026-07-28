import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-circular-ring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="circular-ring-container">
      <svg class="ring-svg" viewBox="0 0 100 100">
        <circle class="ring-bg" cx="50" cy="50" r="40"></circle>
        <circle class="ring-progress" cx="50" cy="50" r="40"
                [attr.stroke]="ringColor"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="dashOffset"
                [ngStyle]="{'transition': 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)'}"></circle>
      </svg>
      <div class="ring-label-wrapper">
        <span class="ring-score">{{ score }}</span>
        <span class="ring-unit" *ngIf="unit">{{ unit }}</span>
      </div>
    </div>
  `,
  styles: [`
    .circular-ring-container {
      position: relative;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
    .ring-svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .ring-bg {
      fill: none;
      stroke: rgba(0, 0, 0, 0.05);
      stroke-width: 8px;
    }
    .ring-progress {
      fill: none;
      stroke-width: 8px;
      stroke-linecap: round;
    }
    .ring-label-wrapper {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .ring-score {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: var(--color-text);
      line-height: 1;
    }
    .ring-unit {
      font-size: 10px;
      font-weight: 600;
      color: var(--color-muted);
      text-transform: uppercase;
      margin-top: 2px;
    }
  `]
})
export class CircularRingComponent implements OnInit, OnChanges {
  @Input() score: number = 0;
  @Input() unit: string = 'RHI';

  circumference = 2 * Math.PI * 40; // 251.327
  dashOffset = this.circumference;
  ringColor = 'var(--color-success)';

  ngOnInit() {
    this.updateRing();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['score']) {
      this.updateRing();
    }
  }

  private updateRing() {
    const val = Math.max(0, Math.min(100, this.score));
    
    // Animate from full offset to target
    setTimeout(() => {
      this.dashOffset = this.circumference - (val / 100) * this.circumference;
    }, 100);

    // Color code: green > 70, yellow 50-70, red < 50
    if (val > 70) {
      this.ringColor = 'var(--color-success)';
    } else if (val >= 50) {
      this.ringColor = 'var(--color-warning)';
    } else {
      this.ringColor = 'var(--color-danger)';
    }
  }
}
