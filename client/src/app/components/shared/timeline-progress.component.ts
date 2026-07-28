import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timeline-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline-progress-bar">
      <div class="timeline-track">
        <div class="timeline-progress-fill" [style.width.%]="progressPercent"></div>
      </div>
      <div class="timeline-steps">
        <div class="timeline-step" *ngFor="let step of steps; let i = index"
             [class.active]="i === activeIndex"
             [class.completed]="i < activeIndex">
          <div class="step-dot">
            <i class="ti ti-check" *ngIf="i < activeIndex"></i>
            <span class="step-num" *ngIf="i >= activeIndex">{{ i + 1 }}</span>
          </div>
          <span class="step-label">{{ step }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .timeline-progress-bar {
      position: relative;
      width: 100%;
      padding: 16px 0;
      margin: 16px 0;
    }
    .timeline-track {
      position: absolute;
      top: 30px;
      left: 5%;
      right: 5%;
      height: 4px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 2px;
      z-index: 1;
    }
    .timeline-progress-fill {
      height: 100%;
      background: var(--color-success);
      border-radius: 2px;
      transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      width: 0;
    }
    .timeline-steps {
      display: flex;
      justify-content: space-between;
      position: relative;
      z-index: 2;
      width: 100%;
    }
    .timeline-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 16%;
      text-align: center;
    }
    .step-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #fff;
      border: 2.2px solid rgba(0, 0, 0, 0.1);
      color: var(--color-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .timeline-step.active .step-dot {
      border-color: var(--color-primary);
      color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
    }
    .timeline-step.completed .step-dot {
      border-color: var(--color-success);
      background: var(--color-success);
      color: #fff;
    }
    .step-label {
      margin-top: 8px;
      font-size: 11px;
      font-weight: 500;
      color: var(--color-muted);
    }
    .timeline-step.active .step-label {
      color: var(--color-primary);
      font-weight: 600;
    }
    .timeline-step.completed .step-label {
      color: var(--color-text);
    }
  `]
})
export class TimelineProgressComponent implements OnChanges {
  @Input() steps: string[] = ['Submitted', 'AI Verified', 'Assigned', 'In Progress', 'Fixed', 'Closed'];
  @Input() activeStep: string = 'reported';

  activeIndex: number = 0;
  progressPercent: number = 0;

  ngOnChanges() {
    const s = (this.activeStep || '').toLowerCase().trim();
    const mapping: { [key: string]: number } = {
      'reported': 0,
      'submitted': 0,
      'verified': 1,
      'assigned': 2,
      'in_progress': 3,
      'fixed': 4,
      'closed': 5
    };
    
    this.activeIndex = mapping[s] !== undefined ? mapping[s] : 0;
    
    if (this.steps.length > 1) {
      // Scale percentage up to 100% across the track width
      this.progressPercent = (this.activeIndex / (this.steps.length - 1)) * 90;
    }
  }
}
