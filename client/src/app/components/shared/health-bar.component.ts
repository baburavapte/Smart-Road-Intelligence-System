import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-health-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="health-bar-container">
      <div class="health-bar-header" *ngIf="label || showValue">
        <span class="health-bar-label" *ngIf="label">{{ label }}</span>
        <span class="health-bar-value" *ngIf="showValue">{{ value }}%</span>
      </div>
      <div class="health-bar-track">
        <div class="health-bar-fill"
             [style.width.%]="value"
             [style.background]="fillColor"
             [ngStyle]="{'transition': 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'}"></div>
      </div>
    </div>
  `,
  styles: [`
    .health-bar-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .health-bar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .health-bar-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--color-text);
    }
    .health-bar-value {
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text);
    }
    .health-bar-track {
      width: 100%;
      height: 8px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
      overflow: hidden;
    }
    .health-bar-fill {
      height: 100%;
      border-radius: 4px;
      width: 0; /* Animated on load */
    }
  `]
})
export class HealthBarComponent implements OnChanges {
  @Input() value: number = 0;
  @Input() label: string = '';
  @Input() showValue: boolean = true;

  fillColor: string = 'var(--color-success)';

  ngOnChanges() {
    const val = Math.max(0, Math.min(100, this.value));
    if (val > 70) {
      this.fillColor = 'var(--color-success)';
    } else if (val >= 50) {
      this.fillColor = 'var(--color-warning)';
    } else {
      this.fillColor = 'var(--color-danger)';
    }
  }
}
