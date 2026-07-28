import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="badgeClass">
      <i class="badge-icon" *ngIf="badgeIcon" [ngClass]="badgeIcon"></i>
      {{ displayText }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border: 0.5px solid transparent;
      white-space: nowrap;
    }
    
    /* Colors mapping using Apple liquid tokens */
    .status-critical { background: rgba(255, 69, 58, 0.12); color: #FF453A; border-color: rgba(255, 69, 58, 0.2); }
    .status-high { background: rgba(255, 159, 10, 0.15); color: #ff9f0a; border-color: rgba(255, 159, 10, 0.2); }
    .status-medium { background: rgba(255, 214, 10, 0.15); color: #b8860b; border-color: rgba(255, 214, 10, 0.2); }
    .status-low { background: rgba(48, 209, 88, 0.12); color: #30D158; border-color: rgba(48, 209, 88, 0.2); }
    .status-none { background: rgba(48, 209, 88, 0.12); color: #30D158; border-color: rgba(48, 209, 88, 0.2); }
    
    .status-overdue { background: rgba(255, 69, 58, 0.15); color: #FF453A; border-color: rgba(255, 69, 58, 0.25); font-weight: 700; animation: pulseBorder 1.5s infinite alternate; }
    
    .status-info { background: rgba(0, 122, 255, 0.12); color: #007AFF; border-color: rgba(0, 122, 255, 0.2); }
    .status-purple { background: rgba(191, 90, 242, 0.12); color: #BF5AF2; border-color: rgba(191, 90, 242, 0.2); }
    
    @keyframes pulseBorder {
      from { box-shadow: 0 0 2px rgba(255, 69, 58, 0.2); }
      to { box-shadow: 0 0 8px rgba(255, 69, 58, 0.45); }
    }
    
    .badge-icon {
      font-size: 11px;
    }
  `]
})
export class StatusBadgeComponent implements OnChanges {
  @Input() status: string = '';
  @Input() type: 'severity' | 'lifecycle' | 'sla' = 'severity';

  badgeClass: string = 'status-info';
  displayText: string = '';
  badgeIcon: string = '';

  ngOnChanges() {
    const s = (this.status || '').toLowerCase().trim();
    this.displayText = this.status;

    if (this.type === 'sla') {
      if (s === 'overdue' || s === 'true' || s === 'breached') {
        this.badgeClass = 'status-overdue';
        this.displayText = 'Overdue';
        this.badgeIcon = 'ti ti-alert-circle';
      } else {
        this.badgeClass = 'status-low';
        this.displayText = 'Within SLA';
        this.badgeIcon = 'ti ti-circle-check';
      }
      return;
    }

    if (this.type === 'severity') {
      this.badgeIcon = s === 'critical' ? 'ti ti-alert-triangle' : '';
      if (s === 'critical') this.badgeClass = 'status-critical';
      else if (s === 'high') this.badgeClass = 'status-high';
      else if (s === 'medium' || s === 'moderate') this.badgeClass = 'status-medium';
      else if (s === 'low') this.badgeClass = 'status-low';
      else this.badgeClass = 'status-none';
      return;
    }

    // Lifecycle: reported -> verified -> assigned -> in_progress -> fixed -> closed
    if (s === 'reported' || s === 'submitted') {
      this.badgeClass = 'status-info';
      this.displayText = 'Submitted';
    } else if (s === 'verified') {
      this.badgeClass = 'status-purple';
      this.displayText = 'AI Verified';
      this.badgeIcon = 'ti ti-cpu';
    } else if (s === 'assigned') {
      this.badgeClass = 'status-medium';
      this.displayText = 'Assigned';
    } else if (s === 'in_progress' || s === 'repairing') {
      this.badgeClass = 'status-high';
      this.displayText = 'In Progress';
      this.badgeIcon = 'ti ti-progress';
    } else if (s === 'fixed' || s === 'repaired') {
      this.badgeClass = 'status-low';
      this.displayText = 'Fixed';
      this.badgeIcon = 'ti ti-check';
    } else if (s === 'closed') {
      this.badgeClass = 'status-none';
      this.displayText = 'Closed';
      this.badgeIcon = 'ti ti-circle-check';
    } else {
      this.badgeClass = 'status-info';
    }
  }
}
