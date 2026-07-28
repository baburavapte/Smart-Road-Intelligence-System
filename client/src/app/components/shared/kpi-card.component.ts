import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-card glass-card" [ngClass]="accentClass">
      <span class="kpi-title">{{ label }}</span>
      <div class="kpi-value-row">
        <span class="kpi-value">{{ displayValue }}</span>
        <span class="kpi-badge" *ngIf="trendBadge" [ngClass]="badgeClass">{{ trendBadge }}</span>
      </div>
    </div>
  `,
  styles: [`
    .kpi-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-left: 4px solid transparent;
      height: 100%;
    }
    .kpi-card.accent-roads { border-left-color: var(--color-primary); }
    .kpi-card.accent-active { border-left-color: var(--color-danger); }
    .kpi-card.accent-resolved { border-left-color: var(--color-success); }
    .kpi-card.accent-pending { border-left-color: var(--color-warning); }
    .kpi-card.accent-ai { border-left-color: var(--color-forecast); }
    
    .kpi-card.pulse-warning {
      animation: pulseBorder 2s infinite ease-in-out;
    }
    @keyframes pulseBorder {
      0%, 100% { border-left-color: var(--color-warning); box-shadow: var(--glass-shadow); }
      50% { border-left-color: var(--color-danger); box-shadow: 0 0 12px rgba(255, 69, 58, 0.25); }
    }
    .kpi-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--color-muted);
    }
    .kpi-value-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }
    .kpi-value {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: var(--color-text);
    }
    .kpi-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .kpi-badge.badge-success { background: rgba(48, 209, 88, 0.12); color: #248a3d; border: 0.5px solid rgba(48, 209, 88, 0.2); }
    .kpi-badge.badge-danger { background: rgba(255, 69, 58, 0.12); color: #d70015; border: 0.5px solid rgba(255, 69, 58, 0.2); }
    .kpi-badge.badge-warning { background: rgba(255, 214, 10, 0.15); color: #8a6d00; border: 0.5px solid rgba(255, 214, 10, 0.2); }
  `]
})
export class KPICardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() value: number | string = 0;
  @Input() label: string = '';
  @Input() accentClass: string = '';
  @Input() trendBadge: string = '';
  @Input() badgeClass: string = 'badge-success';

  displayValue: string | number = 0;
  private animationFrameId: any;

  ngOnInit() {
    this.animateValue(0, this.numericValue(), 600);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && !changes['value'].firstChange) {
      const prev = this.parseNumber(changes['value'].previousValue);
      const curr = this.parseNumber(changes['value'].currentValue);
      this.animateValue(prev, curr, 600);
    }
  }

  ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  private numericValue(): number {
    return this.parseNumber(this.value);
  }

  private parseNumber(val: any): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/,/g, '').replace(/%/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private animateValue(start: number, end: number, duration: number) {
    if (typeof this.value === 'string' && isNaN(this.parseNumber(this.value))) {
      this.displayValue = this.value;
      return;
    }

    const startTime = performance.now();
    const isPercent = typeof this.value === 'string' && this.value.includes('%');
    const hasCommas = typeof this.value === 'string' && this.value.includes(',');

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Calm easeOutQuart animation
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = start + (end - start) * ease;
      
      let formatted: string | number = Math.round(current);
      if (end % 1 !== 0 || start % 1 !== 0) {
        formatted = current.toFixed(1);
      }

      if (isPercent) {
        this.displayValue = `${formatted}%`;
      } else if (hasCommas) {
        this.displayValue = Number(formatted).toLocaleString();
      } else {
        this.displayValue = formatted;
      }

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(update);
      } else {
        this.displayValue = this.value;
      }
    };

    this.animationFrameId = requestAnimationFrame(update);
  }
}
