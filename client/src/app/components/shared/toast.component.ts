import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      <div
        *ngFor="let toast of toasts$ | async; trackBy: trackById"
        class="toast-item"
        [class]="'toast-' + toast.type"
        [class.toast-visible]="toast.visible"
        [class.toast-hidden]="!toast.visible"
        (click)="toastService.dismiss(toast.id)"
        role="alert">
        <div class="toast-icon">
          <i [class]="getIcon(toast.type)" aria-hidden="true"></i>
        </div>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" aria-label="Dismiss notification" type="button">
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
      max-width: 360px;
    }
    .toast-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 14px;
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 0.5px solid rgba(255,255,255,0.9);
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      pointer-events: all;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      transform: translateX(120%);
      opacity: 0;
    }
    .toast-visible {
      transform: translateX(0);
      opacity: 1;
    }
    .toast-hidden {
      transform: translateX(120%);
      opacity: 0;
    }
    .toast-success { background: rgba(48,209,88,0.12);
                     border-color: rgba(48,209,88,0.25); }
    .toast-error   { background: rgba(255,69,58,0.1);
                     border-color: rgba(255,69,58,0.2); }
    .toast-warning { background: rgba(255,214,10,0.12);
                     border-color: rgba(255,214,10,0.25); }
    .toast-info    { background: rgba(0,122,255,0.08);
                     border-color: rgba(0,122,255,0.18); }
    .toast-icon { font-size: 18px; flex-shrink: 0; }
    .toast-success .toast-icon { color: #30D158; }
    .toast-error   .toast-icon { color: #FF453A; }
    .toast-warning .toast-icon { color: #c49a00; }
    .toast-info    .toast-icon { color: #007AFF; }
    .toast-message {
      font-size: 13px;
      font-weight: 500;
      color: #1D1D1F;
      flex: 1;
      line-height: 1.4;
    }
    .toast-close {
      font-size: 14px;
      color: #6E6E73;
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      flex-shrink: 0;
    }
    @media (max-width: 768px) {
      .toast-container {
        bottom: 80px;
        right: 12px;
        left: 12px;
        max-width: 100%;
      }
    }
  `]
})
export class ToastComponent {
  toasts$ = inject(ToastService).toasts$;
  toastService = inject(ToastService);
  trackById = (_: number, t: Toast) => t.id;
  getIcon(type: string) {
    const icons: { [key: string]: string } = {
      success: 'ti ti-circle-check',
      error:   'ti ti-circle-x',
      warning: 'ti ti-alert-triangle',
      info:    'ti ti-info-circle'
    };
    return icons[type] || 'ti ti-info-circle';
  }
}
