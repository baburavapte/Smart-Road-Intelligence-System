import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-card">
      <i class="ti ti-wifi-off" aria-hidden="true"></i>
      <p class="error-title">{{ title }}</p>
      <p>{{ message }}</p>
      <button class="btn-primary btn-sm" (click)="retry.emit()" type="button" style="margin-top: 8px;">
        <i class="ti ti-refresh" aria-hidden="true"></i>
        Try again
      </button>
    </div>
  `
})
export class ErrorCardComponent {
  @Input() title = 'Failed to load';
  @Input() message = 'Something went wrong. Please try again.';
  @Output() retry = new EventEmitter<void>();
}
