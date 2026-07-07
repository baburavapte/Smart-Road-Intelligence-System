import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="app-layout">
      <!-- Floating Left Sidebar Navigation (Desktop Mode) / Bottom Navigation (Tablet & Mobile) -->
      <aside class="sidebar animate-fade-in">
        <div class="sidebar-top">
          <!-- Logo Mark (Non-clickable) -->
          <div class="logo-mark" aria-hidden="true">
            <span class="logo-icon">RI</span>
          </div>

          <!-- Nav Items -->
          <a routerLink="/admin" routerLinkActive="active" class="nav-item" title="Government Dashboard">
            <span class="indicator"></span>
            <i class="ti ti-layout-dashboard" aria-hidden="true"></i>
            <span class="tooltip">Dashboard</span>
          </a>

          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" title="Map View">
            <span class="indicator"></span>
            <i class="ti ti-map-2" aria-hidden="true"></i>
            <span class="tooltip">Map View</span>
          </a>

          <a routerLink="/citizen-dashboard" routerLinkActive="active" class="nav-item" title="Citizen Reports">
            <span class="indicator"></span>
            <i class="ti ti-alert-triangle" aria-hidden="true"></i>
            <span class="tooltip">Reports</span>
          </a>

          <a routerLink="/road-health" routerLinkActive="active" class="nav-item" title="Road Health Dashboard">
            <span class="indicator"></span>
            <i class="ti ti-road" aria-hidden="true"></i>
            <span class="tooltip">Road Health</span>
          </a>

          <a routerLink="/history" routerLinkActive="active" class="nav-item" title="AI Analysis Logs">
            <span class="indicator"></span>
            <i class="ti ti-chart-line" aria-hidden="true"></i>
            <span class="tooltip">Analytics</span>
          </a>

          <a routerLink="/route-safety" routerLinkActive="active" class="nav-item" title="Route Safety Planner">
            <span class="indicator"></span>
            <i class="ti ti-crystal-ball" aria-hidden="true"></i>
            <span class="tooltip">Forecast</span>
          </a>

          <div class="nav-divider" aria-hidden="true"></div>

          <!-- Notification Link with optional badge indicator -->
          <a routerLink="/notifications" routerLinkActive="active" class="nav-item" title="Notifications">
            <span class="indicator"></span>
            <i class="ti ti-bell" aria-hidden="true"></i>
            <span class="notif-badge-dot" *ngIf="unreadCount > 0"></span>
            <span class="tooltip">Notifications ({{ unreadCount }})</span>
          </a>
        </div>

        <div class="sidebar-bottom">
          <!-- Settings Icon -->
          <a routerLink="/about" routerLinkActive="active" class="nav-item" title="About & Settings">
            <span class="indicator"></span>
            <i class="ti ti-settings" aria-hidden="true"></i>
            <span class="tooltip">Settings</span>
          </a>

          <!-- User Avatar Circle -->
          <div class="user-avatar" title="User Session" aria-hidden="true">
            <span>RI</span>
          </div>
        </div>
      </aside>

      <!-- Main Layout Container -->
      <div class="main-container-layout">
        <main class="content-viewport">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }

    /* Sidebar Navigation */
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      width: var(--sidebar-width);
      height: 100vh;
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border-right: 0.5px solid rgba(0, 0, 0, 0.07);
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
      background: var(--primary);
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

    .nav-item {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      text-decoration: none;
      position: relative;
      transition: var(--transition);
      font-size: 20px;
    }

    .nav-item:hover {
      background: rgba(0, 122, 255, 0.08);
      color: var(--primary);
    }

    .nav-item.active {
      background: rgba(0, 122, 255, 0.12);
      color: var(--primary);
    }

    /* Active Indicator Pill on Left Edge */
    .nav-item .indicator {
      position: absolute;
      left: 0;
      top: 12px;
      width: 3px;
      height: 20px;
      background: var(--primary);
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
      -webkit-backdrop-filter: blur(12px);
      border: 0.5px solid rgba(0, 0, 0, 0.08);
      color: var(--text-primary);
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
      background: var(--danger);
      border-radius: 50%;
      box-shadow: 0 0 0 1.5px white;
    }

    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #007AFF 0%, #BF5AF2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: -0.2px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
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

    /* Breakpoint adjustments */
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

    @media (max-width: 768px) {
      /* Show 5 main items only on mobile */
      .nav-item[title="AI Analysis Logs"],
      .nav-item[title="About & Settings"] {
        display: none;
      }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  unreadCount = 0;
  mobileOpen = false;
  exploreOpen = false;
  citizenOpen = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private apiService: ApiService) {}

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 900) {
      this.mobileOpen = false;
    }
  }

  ngOnInit(): void {
    this.checkNotifications();
    this.intervalId = setInterval(() => this.checkNotifications(), 15000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  toggleExplore(): void {
    this.exploreOpen = !this.exploreOpen;
    this.citizenOpen = false;
  }

  toggleCitizen(): void {
    this.citizenOpen = !this.citizenOpen;
    this.exploreOpen = false;
  }

  closeAll(): void {
    this.exploreOpen = false;
    this.citizenOpen = false;
  }

  closeMobile(): void {
    this.mobileOpen = false;
  }

  checkNotifications(): void {
    const email = localStorage.getItem('citizenEmail');
    if (!email) {
      this.unreadCount = 0;
      return;
    }
    this.apiService.getUnreadNotificationsCount(email).subscribe({
      next: (res) => {
        if (res.success) this.unreadCount = res.count;
      },
      error: () => {}
    });
  }
}
