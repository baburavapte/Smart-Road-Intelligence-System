import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-card" [style.height]="height">
      <ng-container [ngSwitch]="type">

        <ng-container *ngSwitchCase="'kpi'">
          <div class="skeleton-line tiny"   style="margin-bottom:14px"></div>
          <div class="skeleton-line narrow" style="height:26px;border-radius:6px"></div>
          <div class="skeleton-line tiny"   style="margin-top:10px;width:55%"></div>
        </ng-container>

        <ng-container *ngSwitchCase="'card'">
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line wide"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line narrow"></div>
        </ng-container>

        <ng-container *ngSwitchCase="'row'">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="skeleton-circle" style="width:32px;height:32px;flex-shrink:0"></div>
            <div style="flex:1">
              <div class="skeleton-line wide"   style="margin-bottom:6px"></div>
              <div class="skeleton-line medium" style="margin-bottom:0"></div>
            </div>
          </div>
        </ng-container>

        <ng-container *ngSwitchCase="'chart'">
          <div class="skeleton-line medium" style="margin-bottom:20px"></div>
          <div style="display:flex;align-items:flex-end;gap:6px;height:80px">
            <div *ngFor="let h of barHeights" class="skeleton-line"
                 style="flex:1;margin:0;border-radius:4px 4px 0 0"
                 [style.height]="h"></div>
          </div>
        </ng-container>

        <ng-container *ngSwitchCase="'table'">
          <div *ngFor="let r of [1,2,3,4,5]"
               style="display:flex;gap:12px;padding:10px 0;
                      border-bottom:0.5px solid rgba(0,0,0,0.05)">
            <div class="skeleton-line" style="width:80px;margin:0;flex-shrink:0"></div>
            <div class="skeleton-line wide" style="margin:0"></div>
            <div class="skeleton-line" style="width:60px;margin:0;flex-shrink:0"></div>
          </div>
        </ng-container>

        <ng-container *ngSwitchCase="'ring'">
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
            <div class="skeleton-circle" style="width:80px;height:80px"></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line wide"></div>
            <div class="skeleton-line wide"></div>
          </div>
        </ng-container>

        <ng-container *ngSwitchDefault>
          <div class="skeleton-line wide"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line narrow"></div>
        </ng-container>

      </ng-container>
    </div>
  `
})
export class SkeletonComponent {
  @Input() type: 'kpi'|'card'|'row'|'chart'|'table'|'ring'|'default' = 'default';
  @Input() height = 'auto';
  barHeights = ['40%','65%','50%','80%','45%','90%','60%'];
}
