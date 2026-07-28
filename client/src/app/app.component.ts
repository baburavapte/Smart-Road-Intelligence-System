import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { ToastComponent } from './components/shared/toast.component';
import { SocketService } from './services/socket.service';
import { ToastService } from './services/toast.service';
import { OfflineService } from './services/offline.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ToastComponent],
  template: `
    <div class="offline-banner" *ngIf="isOffline" role="alert">
      <i class="ti ti-wifi-off" aria-hidden="true"></i>
      <span>No internet connection — some features may be unavailable</span>
    </div>

    <div class="app-layout" [class.no-sidebar]="!showSidebar" [style.margin-top]="isOffline ? '40px' : '0'">
      
      <!-- Left Sidebar (Visible only when logged in) -->
      <aside class="sidebar animate-fade-in" *ngIf="showSidebar">
        <div class="sidebar-top">
          <!-- Logo Mark -->
          <div class="logo-mark" aria-hidden="true">
            <span class="logo-icon">RI</span>
          </div>

          <!-- Nav List: CITIZEN -->
          <ng-container *ngIf="userRole === 'citizen'">
            <a routerLink="/citizen/dashboard" routerLinkActive="active" class="nav-item" title="Citizen Dashboard">
              <span class="indicator"></span>
              <i class="ti ti-layout-dashboard" aria-hidden="true"></i>
              <span class="tooltip">Citizen Dashboard</span>
            </a>

            <a routerLink="/citizen/report" routerLinkActive="active" class="nav-item" title="Submit Report">
              <span class="indicator"></span>
              <i class="ti ti-plus" aria-hidden="true"></i>
              <span class="tooltip">Submit Report</span>
            </a>
          </ng-container>

          <!-- Nav List: OFFICER / ADMIN -->
          <ng-container *ngIf="userRole === 'officer' || userRole === 'admin'">
            <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item" title="Government Dashboard">
              <span class="indicator"></span>
              <i class="ti ti-layout-dashboard" aria-hidden="true"></i>
              <span class="tooltip">Government Dashboard</span>
            </a>

            <a routerLink="/admin/reports" routerLinkActive="active" class="nav-item" title="Reports Management">
              <span class="indicator"></span>
              <i class="ti ti-receipt" aria-hidden="true"></i>
              <span class="sla-badge-nav" *ngIf="overdueCount > 0">{{ overdueCount }}</span>
              <span class="tooltip">Reports ({{ overdueCount }} overdue)</span>
            </a>

            <a routerLink="/admin/road-health" routerLinkActive="active" class="nav-item" title="Road Health Dashboard">
              <span class="indicator"></span>
              <i class="ti ti-road" aria-hidden="true"></i>
              <span class="tooltip">Road Health</span>
            </a>

            <a routerLink="/admin/contractors" routerLinkActive="active" class="nav-item" title="Contractors Portal">
              <span class="indicator"></span>
              <i class="ti ti-users" aria-hidden="true"></i>
              <span class="tooltip">Contractors</span>
            </a>

            <a routerLink="/admin/analytics" routerLinkActive="active" class="nav-item" title="Operational Analytics">
              <span class="indicator"></span>
              <i class="ti ti-chart-bar" aria-hidden="true"></i>
              <span class="tooltip">Analytics</span>
            </a>

            <a routerLink="/admin/forecast" routerLinkActive="active" class="nav-item" title="Condition Forecast">
              <span class="indicator"></span>
              <i class="ti ti-trending-down" aria-hidden="true"></i>
              <span class="tooltip">Forecast</span>
            </a>

            <a routerLink="/admin/schedule" routerLinkActive="active" class="nav-item" title="Maintenance Schedule">
              <span class="indicator"></span>
              <i class="ti ti-calendar" aria-hidden="true"></i>
              <span class="tooltip">Schedule</span>
            </a>

            <a routerLink="/admin/detection" routerLinkActive="active" class="nav-item" title="Run AI Detection">
              <span class="indicator"></span>
              <i class="ti ti-cpu" aria-hidden="true"></i>
              <span class="tooltip">AI Detection</span>
            </a>

            <a routerLink="/admin/route-safety" routerLinkActive="active" class="nav-item" title="Route Safety Planner">
              <span class="indicator"></span>
              <i class="ti ti-shield-check" aria-hidden="true"></i>
              <span class="tooltip">Route Safety</span>
            </a>

            <a *ngIf="userRole === 'admin'" routerLink="/admin/users" routerLinkActive="active" class="nav-item" title="User Management">
              <span class="indicator"></span>
              <i class="ti ti-users-group" aria-hidden="true"></i>
              <span class="tooltip">User Management</span>
            </a>

            <a *ngIf="userRole === 'admin'" routerLink="/admin/audit-logs" routerLinkActive="active" class="nav-item" title="System Audit Logs">
              <span class="indicator"></span>
              <i class="ti ti-shield-alert" aria-hidden="true"></i>
              <span class="tooltip">Audit Logs</span>
            </a>
          </ng-container>

          <div class="nav-divider" aria-hidden="true"></div>

          <!-- Shared links: Notifications -->
          <a routerLink="/notifications" routerLinkActive="active" class="nav-item" title="Notifications">
            <span class="indicator"></span>
            <i class="ti ti-bell" aria-hidden="true"></i>
            <span class="notif-badge-dot" *ngIf="unreadCount > 0"></span>
            <span class="tooltip">Notifications ({{ unreadCount }} unread)</span>
          </a>
        </div>

        <div class="sidebar-bottom">
          <!-- Settings Icon -->
          <a routerLink="/settings" routerLinkActive="active" class="nav-item" title="Settings">
            <span class="indicator"></span>
            <i class="ti ti-settings" aria-hidden="true"></i>
            <span class="tooltip">Settings</span>
          </a>

          <!-- Logout Button -->
          <button class="nav-item btn-logout-sidebar" (click)="logout()" title="Logout">
            <i class="ti ti-logout" aria-hidden="true"></i>
            <span class="tooltip">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Main Layout Container -->
      <div class="main-container-layout">
        <main class="content-viewport">
          <router-outlet></router-outlet>
        </main>
        <app-toast></app-toast>
      </div>

    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }

    .app-layout.no-sidebar .main-container-layout {
      margin-left: 0 !important;
      padding-bottom: 0 !important;
    }

    /* Sidebar Navigation */
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      width: var(--sidebar-width);
      height: 100vh;
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-right: 0.5px solid rgba(0, 0, 0, 0.08);
      padding: 24px 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
    }

    .sidebar-top, .sidebar-bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    .logo-mark {
      width: 36px;
      height: 36px;
      background: var(--color-primary);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 12px;
      box-shadow: 0 4px 10px rgba(0, 122, 255, 0.2);
    }

    .logo-icon {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
    }

    .nav-item {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-muted);
      text-decoration: none;
      position: relative;
      transition: var(--transition);
      font-size: 20px;
      border: none;
      background: transparent;
      cursor: pointer;
    }

    .nav-item:hover {
      background: rgba(0, 122, 255, 0.06);
      color: var(--color-primary);
    }

    .nav-item.active {
      background: rgba(0, 122, 255, 0.1);
      color: var(--color-primary);
    }

    /* Active Indicator Pill on Left Edge */
    .nav-item .indicator {
      position: absolute;
      left: 0;
      top: 12px;
      width: 3px;
      height: 20px;
      background: var(--color-primary);
      border-radius: 0 3px 3px 0;
      opacity: 0;
      transition: var(--transition);
    }

    .nav-item.active .indicator {
      opacity: 1;
    }

    /* Floating Tooltip Label on Right Side */
    .nav-item .tooltip {
      position: absolute;
      left: 60px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      border: 0.5px solid rgba(0, 0, 0, 0.08);
      color: var(--color-text);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transform: translateX(-6px);
      transition: var(--transition);
      pointer-events: none;
      z-index: 1010;
    }

    .nav-item:hover .tooltip {
      opacity: 1;
      visibility: visible;
      transform: translateX(0);
    }

    .nav-divider {
      width: 24px;
      height: 0.5px;
      background: rgba(0, 0, 0, 0.08);
      margin: 8px 0;
    }

    .notif-badge-dot {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 6px;
      height: 6px;
      background: var(--color-danger);
      border-radius: 50%;
      box-shadow: 0 0 0 1.5px white;
    }

    .sla-badge-nav {
      position: absolute;
      top: 8px;
      right: 4px;
      background: var(--color-danger);
      color: white;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 8px;
      border: 1px solid white;
    }

    .btn-logout-sidebar {
      color: var(--color-danger);
    }
    
    .btn-logout-sidebar:hover {
      background: rgba(255, 69, 58, 0.08);
      color: var(--color-danger);
    }

    /* Main Viewport Container */
    .main-container-layout {
      flex: 1;
      margin-left: var(--sidebar-width);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 1;
    }

    .content-viewport {
      flex: 1;
      width: 100%;
    }

    /* Mobile bar navigation style override */
    @media (max-width: 1024px) {
      .sidebar {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 60px;
        border-right: none;
        border-top: 0.5px solid rgba(0, 0, 0, 0.07);
        flex-direction: row;
        padding: 0 16px;
        justify-content: space-around;
      }

      .sidebar-top, .sidebar-bottom {
        flex-direction: row;
        width: auto;
        gap: 8px;
      }

      .logo-mark, .nav-divider {
        display: none;
      }

      .nav-item .indicator {
        left: 12px;
        bottom: 0;
        top: auto;
        width: 20px;
        height: 3px;
        border-radius: 3px 3px 0 0;
      }

      .nav-item .tooltip {
        display: none;
      }

      .main-container-layout {
        margin-left: 0;
        padding-bottom: 60px;
      }
    }

    .offline-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: rgba(255, 69, 58, 0.95);
      backdrop-filter: blur(12px);
      color: #fff;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      animation: slideDown 0.3s ease;
      height: 40px;
      box-sizing: border-box;
    }
    @keyframes slideDown {
      from { transform: translateY(-100%); }
      to   { transform: translateY(0); }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  userRole = '';
  unreadCount = 0;
  overdueCount = 0;
  isOffline = false;

  get showSidebar(): boolean {
    return this.isLoggedIn && this.router.url !== '/login';
  }
  private checkInterval: any;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router,
    private socketService: SocketService,
    private toastService: ToastService,
    private offlineService: OfflineService
  ) {}

  ngOnInit() {
    this.offlineService.isOnline$.subscribe(online => {
      const wasOffline = this.isOffline;
      this.isOffline = !online;
      if (online) {
        if (wasOffline) {
          this.toastService.success('Connection restored');
        }
      } else {
        this.toastService.error('No internet connection');
      }
    });

    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.userRole = user?.role || '';
      
      if (this.isLoggedIn) {
        this.runPeriodicChecks();
      } else {
        this.stopPeriodicChecks();
      }
    });

    // Handle WebSocket notification events
    this.socketService.notification$.subscribe(notif => {
      this.toastService.show(notif.message, notif.type === 'new_report' ? 'info' : 'success');
      this.unreadCount++;
      this.runPeriodicChecks();
    });

    // Run first count immediately
    this.runPeriodicChecks();
    this.checkInterval = setInterval(() => this.runPeriodicChecks(), 25000);
  }

  ngOnDestroy() {
    this.stopPeriodicChecks();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private runPeriodicChecks() {
    if (!this.isLoggedIn) return;

    // 1. Check notifications
    const email = this.authService.getUserEmail();
    if (email) {
      this.apiService.getUnreadNotificationsCount(email).subscribe(res => {
        if (res.success) this.unreadCount = res.count;
      });
    }

    // 2. Check overdue SLA count
    if (this.userRole === 'officer' || this.userRole === 'admin') {
      this.apiService.getCitizenReports(undefined, undefined, 1, 100).subscribe(res => {
        if (res.success && res.data) {
          let count = 0;
          res.data.forEach((r: any) => {
            if (r.reportLifecycle !== 'fixed' && r.reportLifecycle !== 'closed') {
              const ageDays = (Date.now() - new Date(r.createdAt).getTime()) / (24 * 60 * 60 * 1000);
              const sev = r.detection?.severity || 'low';
              let limit = 14;
              if (sev === 'critical') limit = 3;
              else if (sev === 'high' || sev === 'medium') limit = 7;
              
              if (ageDays > limit) {
                count++;
              }
            }
          });
          this.overdueCount = count;
        }
      });
    }
  }

  private stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.unreadCount = 0;
    this.overdueCount = 0;
  }
}
