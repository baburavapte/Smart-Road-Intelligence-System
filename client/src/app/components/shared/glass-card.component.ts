import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-glass-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-card" [ngClass]="customClass" [ngStyle]="{'padding': padding}">
      <ng-content></ng-content>
    </div>
  `
})
export class GlassCardComponent {
  @Input() padding: string = '24px';
  @Input() customClass: string = '';
}
