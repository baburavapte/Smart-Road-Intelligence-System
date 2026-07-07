import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

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
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="container small-container">
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text text-center">
            <h1 class="page-title">Notification Center</h1>
            <p class="page-header-subtitle">Stay informed about updates and lifecycle milestones of your reported potholes</p>
          </div>
        </header>

        <!-- Email Configuration -->
        <section class="email-config-card glass-card animate-fade-in-up" style="animation-delay: 0.05s" aria-label="Configure notification email">
          <div class="config-form">
            <div class="input-wrapper">
              <span class="input-icon" aria-hidden="true">
                <i class="ti ti-mail"></i>
              </span>
              <input
                type="email"
                [(ngModel)]="emailInput"
                placeholder="Enter email to check notifications"
                class="email-input"
                (keyup.enter)="loadNotifications()"
                aria-label="Email address"
              />
            </div>
            <button class="btn-primary btn-config" (click)="loadNotifications()">
              Check Updates
            </button>
          </div>
        </section>

        <!-- Notifications Tray Card (Only shown if email configured) -->
        <div class="notifications-tray-wrapper animate-fade-in-up" style="animation-delay: 0.1s" *ngIf="emailInput">
          <!-- Tray Header Actions -->
          <div class="tray-actions-row">
            <!-- Filter Tabs -->
            <nav class="tray-filter-tabs" aria-label="Filter notifications">
              <button [class.active]="filterMode === 'all'" (click)="setFilter('all')">All</button>
              <button [class.active]="filterMode === 'unread'" (click)="setFilter('unread')">Unread</button>
              <button [class.active]="filterMode === 'critical'" (click)="setFilter('critical')">Critical</button>
              <button [class.active]="filterMode === 'system'" (click)="setFilter('system')">System</button>
            </nav>

            <button class="btn-ghost btn-sm" (click)="markAllAsRead()" *ngIf="unreadCount > 0">
              Mark all read
            </button>
          </div>

          <!-- Loading State -->
          <div class="loading-state" *ngIf="loading">
            <span class="spinner" aria-hidden="true"></span>
            <p>Fetching notifications...</p>
          </div>

          <!-- Empty State -->
          <div class="empty-state glass-card" *ngIf="!loading && getFilteredNotifications().length === 0">
            <div class="empty-icon" aria-hidden="true">🔔</div>
            <h3>You're All Caught Up</h3>
            <p>No notifications found in this category for <strong>{{ searchedEmail }}</strong>.</p>
          </div>

          <!-- Notification Items List -->
          <section class="notifications-list" *ngIf="!loading && getFilteredNotifications().length > 0" aria-label="Notifications list">
            <div
              class="notification-item glass-card"
              *ngFor="let notif of getFilteredNotifications()"
              [class.unread-item]="!notif.read"
              [class.read-item]="notif.read"
              (click)="markAsRead(notif)"
            >
              <!-- Unread status dot on right -->
              <div class="notif-status-dot" *ngIf="!notif.read" aria-label="Unread"></div>
              
              <!-- Colored Icon Square box -->
              <div class="notif-icon-box" [ngClass]="notif.type" aria-hidden="true">
                {{ getIconForType(notif.type) }}
              </div>

              <!-- Main text detail -->
              <div class="notif-content">
                <div class="notif-header">
                  <h4 class="notif-title">{{ notif.title }}</h4>
                  <span class="notif-time">{{ formatTimeAgo(notif.createdAt) }}</span>
                </div>
                <p class="notif-msg">{{ notif.message }}</p>
                <div class="notif-meta-actions">
                  <a [routerLink]="['/citizen-dashboard']" class="meta-link">Track Report &rarr;</a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-center {
      text-align: center;
    }

    .small-container {
      max-width: 520px !important;
    }

    .email-config-card {
      padding: 16px;
      margin-bottom: 20px;
    }

    .config-form {
      display: flex;
      gap: 12px;
    }

    .input-wrapper {
      position: relative;
      flex: 1;
    }

    .input-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      color: var(--text-secondary);
      display: flex;
    }

    .email-input {
      padding-left: 40px;
      border-radius: 20px;
    }

    .btn-config {
      flex-shrink: 0;
    }

    /* Notification Tray Card */
    .notifications-tray-wrapper {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .tray-actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 4px;
    }

    /* Segmented filter tabs */
    .tray-filter-tabs {
      display: flex;
      background: rgba(0, 0, 0, 0.04);
      padding: 2px;
      border-radius: 14px;
    }

    .tray-filter-tabs button {
      border: none;
      background: transparent;
      padding: 5px 12px;
      border-radius: 12px;
      font-family: inherit;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition);
    }

    .tray-filter-tabs button.active {
      background: white;
      color: var(--primary);
      box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.04);
      font-weight: 600;
    }

    /* Notifications List */
    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .notification-item {
      display: flex;
      padding: 16px;
      gap: 14px;
      position: relative;
      cursor: pointer;
      border-radius: 16px !important;
      transition: var(--transition);
      border-left: 3.5px solid transparent !important;
    }

    .notification-item:hover {
      transform: scale(1.01);
      background: rgba(255, 255, 255, 0.85);
      border-color: rgba(0, 0, 0, 0.04);
    }

    .unread-item {
      border-left-color: var(--primary) !important;
      background: white;
    }

    .read-item {
      opacity: 0.8;
      background: rgba(255, 255, 255, 0.5);
    }

    .notif-status-dot {
      position: absolute;
      top: 18px;
      right: 18px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--primary);
    }

    /* Colored icon square */
    .notif-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    /* Mapping category backgrounds */
    .notif-icon-box.report_submitted { background: rgba(133, 133, 139, 0.08); color: #85858b; }
    .notif-icon-box.report_verified { background: rgba(0, 122, 255, 0.08); color: var(--primary); }
    .notif-icon-box.team_assigned { background: rgba(88, 86, 214, 0.08); color: #5856d6; }
    .notif-icon-box.repair_started { background: rgba(255, 159, 10, 0.08); color: #ff9f0a; }
    .notif-icon-box.repair_completed { background: rgba(48, 209, 88, 0.08); color: var(--success); }
    .notif-icon-box.report_closed { background: rgba(0, 0, 0, 0.04); color: var(--text-secondary); }

    .notif-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .notif-header {
      display: flex;
      justify-content: space-between;
      padding-right: 16px;
      align-items: baseline;
    }

    .notif-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .notif-time {
      font-size: 10px;
      color: var(--text-secondary);
    }

    .notif-msg {
      font-size: 12.5px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .notif-meta-actions {
      margin-top: 4px;
    }

    .meta-link {
      font-size: 11px;
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
    .meta-link:hover {
      text-decoration: underline;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      gap: 12px;
    }

    .spinner {
      width: 30px;
      height: 30px;
      border: 3px solid rgba(0, 0, 0, 0.05);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class NotificationCenterComponent implements OnInit {
  emailInput: string = '';
  searchedEmail: string = '';
  notifications: Notification[] = [];
  unreadCount: number = 0;
  loading: boolean = false;
  filterMode: 'all' | 'unread' | 'critical' | 'system' = 'all'; // Local filter tab state

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    const savedEmail = localStorage.getItem('citizenEmail');
    if (savedEmail) {
      this.emailInput = savedEmail;
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    if (!this.emailInput.trim()) return;

    this.loading = true;
    this.searchedEmail = this.emailInput.trim();
    localStorage.setItem('citizenEmail', this.searchedEmail);

    this.apiService.getNotifications(this.searchedEmail).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.notifications = res.data;
          this.calculateUnread();
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Failed to load notifications:', err);
      }
    });
  }

  calculateUnread(): void {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  setFilter(mode: 'all' | 'unread' | 'critical' | 'system'): void {
    this.filterMode = mode;
  }

  getFilteredNotifications(): Notification[] {
    if (this.filterMode === 'unread') {
      return this.notifications.filter(n => !n.read);
    }
    if (this.filterMode === 'critical') {
      // Filter by verification actions or repair completion reports
      return this.notifications.filter(n => n.type === 'team_assigned' || n.type === 'repair_completed' || n.message.toLowerCase().includes('critical') || n.title.toLowerCase().includes('critical'));
    }
    if (this.filterMode === 'system') {
      // Filter by database/municipal closed cases
      return this.notifications.filter(n => n.type === 'report_closed' || n.type === 'report_verified');
    }
    return this.notifications;
  }

  markAsRead(notif: Notification): void {
    if (notif.read) return;

    this.apiService.markNotificationAsRead(notif.id).subscribe({
      next: (res) => {
        if (res.success) {
          notif.read = true;
          this.calculateUnread();
        }
      },
      error: (err) => {
        console.error('Failed to mark notification read:', err);
      }
    });
  }

  markAllAsRead(): void {
    if (!this.searchedEmail) return;

    this.apiService.markAllNotificationsAsRead(this.searchedEmail).subscribe({
      next: (res) => {
        if (res.success) {
          this.notifications.forEach(n => n.read = true);
          this.calculateUnread();
        }
      },
      error: (err) => {
        console.error('Failed to mark all notifications read:', err);
      }
    });
  }

  getIconForType(type: string): string {
    const map: any = {
      report_submitted: '📝',
      report_verified: '🔍',
      team_assigned: '👥',
      repair_started: '🛠️',
      repair_completed: '✅',
      report_closed: '📁'
    };
    return map[type] || '🔔';
  }

  formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
