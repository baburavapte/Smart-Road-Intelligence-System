import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { DetectComponent } from './components/detect/detect.component';
import { ResultComponent } from './components/result/result.component';
import { HistoryComponent } from './components/history/history.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AboutComponent } from './components/about/about.component';
import { RouteSafetyComponent } from './components/route-safety/route-safety.component';
import { AdminComponent } from './components/admin/admin.component';
import { CitizenReportComponent } from './components/citizen-report/citizen-report.component';
import { CitizenDashboardComponent } from './components/citizen-dashboard/citizen-dashboard.component';
import { RoadHealthComponent } from './components/road-health/road-health.component';
import { RepairHistoryComponent } from './components/repair-history/repair-history.component';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'detect', component: DetectComponent },
    { path: 'results/:id', component: ResultComponent },
    { path: 'history', component: HistoryComponent },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'route-safety', component: RouteSafetyComponent },
    { path: 'admin', component: AdminComponent },
    { path: 'about', component: AboutComponent },
    { path: 'citizen-report/:detectionId', component: CitizenReportComponent },
    { path: 'citizen-dashboard', component: CitizenDashboardComponent },
    { path: 'road-health', component: RoadHealthComponent },
    { path: 'repair-history/:reportId', component: RepairHistoryComponent },
    { path: 'notifications', component: NotificationCenterComponent },
    { path: '**', redirectTo: '' }
];

