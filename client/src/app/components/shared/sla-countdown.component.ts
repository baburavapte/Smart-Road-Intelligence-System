import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sla-countdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="sla-text" [ngClass]="slaClass">
      <i class="ti" [ngClass]="slaIcon"></i>
      {{ displayText }}
    </span>
  `,
  styles: [`
    .sla-text {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .sla-safe { color: var(--color-success); }
    .sla-warning { color: #d69e2e; } /* Orange-Yellow */
    .sla-danger { color: var(--color-danger); font-weight: 700; }
  `]
})
export class SlaCountdownComponent implements OnChanges {
  @Input() createdAt: string | Date = '';
  @Input() severity: string = 'low';

  displayText = '';
  slaClass = 'sla-safe';
  slaIcon = 'ti-clock';

  ngOnChanges() {
    this.calculateSLA();
  }

  private calculateSLA() {
    if (!this.createdAt) {
      this.displayText = '--';
      return;
    }

    const createdTime = new Date(this.createdAt).getTime();
    const now = Date.now();
    
    // SLA Limits: Critical = 3 days, Moderate = 7 days, Low = 14 days
    const sev = (this.severity || '').toLowerCase();
    let limitDays = 14;
    if (sev === 'critical') limitDays = 3;
    else if (sev === 'high' || sev === 'medium' || sev === 'moderate') limitDays = 7;

    const limitMs = limitDays * 24 * 60 * 60 * 1000;
    const deadlineTime = createdTime + limitMs;
    const diffMs = deadlineTime - now;
    
    // Use Math.floor or Math.ceil based on direction
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    if (diffMs < 0) {
      const overdueDays = Math.abs(Math.floor(diffMs / (24 * 60 * 60 * 1000)));
      this.displayText = `${overdueDays}d overdue`;
      this.slaClass = 'sla-danger';
      this.slaIcon = 'ti-alert-circle-filled';
    } else if (diffDays <= 2) {
      this.displayText = `${diffDays}d remaining`;
      this.slaClass = 'sla-warning';
      this.slaIcon = 'ti-clock-exclamation';
    } else {
      this.displayText = `${diffDays}d remaining`;
      this.slaClass = 'sla-safe';
      this.slaIcon = 'ti-clock';
    }
  }
}
