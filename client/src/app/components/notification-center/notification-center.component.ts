import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SkeletonComponent } from '../shared/skeleton.component';
import { ErrorCardComponent } from '../shared/error-card.component';

interface Notification {
  id: string;
  recipientEmail: string;
  reportId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonComponent, ErrorCardComponent],
  template: `
    <div class="page-container flex-page">
      <div class="container small-container">
        
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">Notifications</h1>
            <p class="page-header-subtitle">Milestones and repair progress updates for your active reports.</p>
          </div>
          <div class="page-header-actions" *ngIf="notifications.length > 0">
            <button class="btn-secondary btn-sm" (click)="markAllAsRead()">Mark All Read</button>
          </div>
        </header>

        <!-- Dynamic email input if session not active -->
        <section class="glass-card config-card animate-fade-in-up" *ngIf="!hasActiveSession">
          <h3 class="card-title" style="margin-bottom: 8px;">Find Pothole Alerts</h3>
          <div class="lookup-row">
            <input type="email" [(ngModel)]="emailInput" placeholder="Enter your email address..." class="glass-input" />
            <button class="btn-primary" (click)="loadNotifications()">Search</button>
          </div>
        </section>

        <!-- Apple notification list layout -->
        <main class="notifications-layout animate-fade-in-up" style="animation-delay: 0.05s" *ngIf="emailInput">
          
          <!-- Filter Tabs -->
          <div class="filter-tabs-row">
            <div class="tab-list">
              <button [class.active]="activeTab === 'all'" (click)="setTab('all')">All</button>
              <button [class.active]="activeTab === 'unread'" (click)="setTab('unread')">Unread</button>
              <button [class.active]="activeTab === 'system'" (click)="setTab('system')">Alerts</button>
            </div>
            <span class="unread-badge-total" *ngIf="unreadCount > 0">{{ unreadCount }} Unread</span>
          </div>

          <!-- Loading state -->
          <div *ngIf="loading" style="display: flex; flex-direction: column; gap: 12px;">
            <app-skeleton type="row"></app-skeleton>
            <app-skeleton type="row"></app-skeleton>
            <app-skeleton type="row"></app-skeleton>
            <app-skeleton type="row"></app-skeleton>
            <app-skeleton type="row"></app-skeleton>
          </div>

          <!-- Error State -->
          <app-error-card
            *ngIf="!loading && error"
            [title]="'Failed to load'"
            [message]="errorMessage"
            (retry)="loadNotifications()">
          </app-error-card>

          <!-- Empty list state -->
          <div class="empty-state glass-card text-center" *ngIf="!loading && !error && filteredNotifications.length === 0">
            <i class="ti ti-bell-off" style="font-size: 36px; color: var(--color-muted); margin-bottom: 8px; display: inline-block;"></i>
            <h3>No notifications</h3>
            <p class="meta">You are all caught up. There are no new alerts.</p>
          </div>

          <!-- Active notifications list -->
          <div class="notifications-list" *ngIf="!loading && !error && filteredNotifications.length > 0">
            <div class="notification-item-card glass-card animate-scale-in" 
                 *ngFor="let notif of filteredNotifications"
                 [class.unread-item]="!notif.read"
                 (click)="markAsRead(notif)">
              
              <!-- Unread blue dot -->
              <div class="unread-indicator-dot" *ngIf="!notif.read"></div>

              <div class="notif-body">
                <div class="notif-header">
                  <span class="notif-type-icon" [ngClass]="notif.type">
                    <i class="ti" [ngClass]="getIconForType(notif.type)"></i>
                  </span>
                  <div class="notif-title-meta">
                    <h4>{{ notif.title }}</h4>
                    <span class="notif-time">{{ notif.createdAt | date:'medium' }}</span>
                  </div>
                </div>
                <p class="notif-desc">{{ notif.message }}</p>
                <div class="notif-actions" style="margin-top: 10px;" *ngIf="notif.reportId">
                  <a [routerLink]="['/citizen/dashboard']" class="btn-ghost btn-sm" style="font-size: 11px; padding: 4px 10px;">
                    Track in Workspace &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  `,
  styles: [`
    .flex-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 80px;
    }

    .config-card {
      padding: 20px;
    }

    .lookup-row {
      display: flex;
      gap: 10px;
    }

    .notifications-layout {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .filter-tabs-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 0.5px solid rgba(0,0,0,0.05);
      padding-bottom: 8px;
    }

    .tab-list {
      display: flex;
      gap: 8px;
    }

    .tab-list button {
      border: none;
      background: transparent;
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-muted);
      cursor: pointer;
      transition: var(--transition);
    }

    .tab-list button.active {
      background: var(--color-primary);
      color: white;
    }

    .unread-badge-total {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-danger);
      background: rgba(255, 69, 58, 0.1);
      padding: 3px 8px;
      border-radius: 8px;
    }

    .loading-state {
      padding: 40px;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(0,0,0,0.05);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
      margin-bottom: 12px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .notification-item-card {
      padding: 16px;
      display: flex;
      gap: 12px;
      position: relative;
      cursor: pointer;
      transition: var(--transition);
    }

    .notification-item-card:hover {
      transform: scale(1.005);
    }

    .unread-item {
      border-left: 3px solid var(--color-primary);
      background: rgba(0, 122, 255, 0.02);
    }

    .unread-indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-primary);
      position: absolute;
      top: 20px;
      right: 20px;
    }

    .notif-body {
      flex: 1;
    }

    .notif-header {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 6px;
    }

    .notif-type-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    
    .notif-type-icon.critical { background: rgba(255, 69, 58, 0.1); color: var(--color-danger); }
    .notif-type-icon.system { background: rgba(255, 214, 10, 0.15); color: #b8860b; }
    .notif-type-icon.info { background: rgba(0, 122, 255, 0.1); color: var(--color-primary); }

    .notif-title-meta h4 {
      font-size: 13px;
      font-weight: 600;
      margin: 0;
    }

    .notif-time {
      font-size: 10px;
      color: var(--color-muted);
    }

    .notif-desc {
      font-size: 12px;
      color: var(--color-muted);
      line-height: 1.45;
    }
  `]
})
export class NotificationCenterComponent implements OnInit {
  emailInput = '';
  hasActiveSession = false;
  loading = false;
  error = false;
  errorMessage = 'Failed to load notifications. Please try again.';
  activeTab = 'all';

  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  unreadCount = 0;

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit() {
    const sessionEmail = this.authService.getUserEmail();
    if (sessionEmail) {
      this.emailInput = sessionEmail;
      this.hasActiveSession = true;
      this.loadNotifications();
    }
  }

  loadNotifications() {
    if (!this.emailInput) return;
    this.loading = true;
    this.error = false;
    this.apiService.getNotifications(this.emailInput).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.notifications = res.data.map((n: any) => ({
            id: n._id,
            recipientEmail: n.recipientEmail,
            reportId: n.reportId,
            type: n.type || 'info',
            title: n.title || 'Report Status Update',
            message: n.message,
            read: n.read,
            createdAt: n.createdAt
          }));
          this.calculateUnread();
          this.applyFilters();
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = true;
        this.errorMessage = err.status === 0
          ? 'Server unreachable — check your connection'
          : err.status === 403
          ? 'You do not have permission to view this'
          : 'Failed to load notifications. Please try again.';
        this.notifications = [];
        this.filteredNotifications = [];
      }
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.applyFilters();
  }

  private applyFilters() {
    this.filteredNotifications = this.notifications.filter(n => {
      if (this.activeTab === 'unread') return !n.read;
      if (this.activeTab === 'system') return n.type === 'critical' || n.type === 'system';
      return true;
    });
  }

  private calculateUnread() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  getIconForType(type: string): string {
    if (type === 'critical') return 'ti-alert-triangle';
    if (type === 'system') return 'ti-settings';
    return 'ti-info-circle';
  }

  markAsRead(notif: Notification) {
    if (notif.read) return;
    this.apiService.markNotificationAsRead(notif.id).subscribe(() => {
      notif.read = true;
      this.calculateUnread();
      this.applyFilters();
    });
  }

  markAllAsRead() {
    if (!this.emailInput) return;
    this.apiService.markAllNotificationsAsRead(this.emailInput).subscribe(() => {
      this.notifications.forEach(n => n.read = true);
      this.calculateUnread();
      this.applyFilters();
    });
  }
}
