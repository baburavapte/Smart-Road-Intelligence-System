import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { citizenGuardFn, adminGuardFn } from './guards/auth.guard';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';
import { AboutComponent } from './components/about/about.component';

export const routes: Routes = [
  // Authentication & Default redirects
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // Public Transparency Dashboard (no login required)
  {
    path: 'public',
    loadComponent: () => import('./components/public-dashboard/public-dashboard.component').then(m => m.PublicDashboardComponent)
  },

  // Citizen Portal Routes (protected by CitizenGuard)
  {
    path: 'citizen',
    canActivate: [citizenGuardFn],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/citizen-dashboard/citizen-dashboard.component').then(m => m.CitizenDashboardComponent)
      },
      {
        path: 'report',
        loadComponent: () => import('./components/citizen-report/citizen-report.component').then(m => m.CitizenReportComponent)
      },
      {
        path: 'report/:detectionId',
        loadComponent: () => import('./components/citizen-report/citizen-report.component').then(m => m.CitizenReportComponent)
      }
    ]
  },

  // Government & Admin Portal Routes (protected by AdminGuard)
  {
    path: 'admin',
    canActivate: [adminGuardFn],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./components/admin/reports-management.component').then(m => m.ReportsManagementComponent)
      },
      {
        path: 'road-health',
        loadComponent: () => import('./components/road-health/road-health.component').then(m => m.RoadHealthComponent)
      },
      {
        path: 'contractors',
        loadComponent: () => import('./components/admin/contractor-portal.component').then(m => m.ContractorPortalComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./components/admin/analytics.component').then(m => m.AnalyticsComponent)
      },
      {
        path: 'forecast',
        loadComponent: () => import('./components/forecast/forecast.component').then(m => m.ForecastComponent)
      },
      {
        path: 'schedule',
        loadComponent: () => import('./components/admin/schedule-calendar.component').then(m => m.ScheduleCalendarComponent)
      },
      {
        path: 'detection',
        loadComponent: () => import('./components/detect/detect.component').then(m => m.DetectComponent)
      },
      {
        path: 'route-safety',
        loadComponent: () => import('./components/route-safety/route-safety.component').then(m => m.RouteSafetyComponent)
      },
      {
        path: 'audit-logs',
        loadComponent: () => import('./components/admin/audit-log.component').then(m => m.AuditLogComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./components/admin/user-management.component').then(m => m.UserManagementComponent)
      }
    ]
  },

  // Legacy/General Shared views
  { 
    path: 'results/:id', 
    loadComponent: () => import('./components/result/result.component').then(m => m.ResultComponent) 
  },
  { 
    path: 'repair-history/:reportId', 
    loadComponent: () => import('./components/repair-history/repair-history.component').then(m => m.RepairHistoryComponent) 
  },
  { path: 'notifications', component: NotificationCenterComponent },
  { path: 'about', component: AboutComponent },
  { 
    path: 'settings', 
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent) 
  },

  // Catch-all Redirect to NotFoundComponent
  { 
    path: '**', 
    loadComponent: () => import('./components/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
