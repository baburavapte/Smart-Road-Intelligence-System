import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { SlaCountdownComponent } from '../shared/sla-countdown.component';
import { environment } from '../../../environments/environment';
import { of } from 'rxjs';

interface CalendarDay {
  dayNum: number;
  date: Date;
  isCurrentMonth: boolean;
  criticalCount: number;
  moderateCount: number;
  routineCount: number;
  repairs: any[];
}

@Component({
  selector: 'app-schedule-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, SlaCountdownComponent],
  template: `
    <div class="page-container">
      <div class="container flex-page">
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div class="page-header-text">
            <h1 class="page-title">Maintenance Schedule</h1>
            <p class="page-header-subtitle">Plan contractor repair cycles, check upcoming schedules, and monitor SLA breaches.</p>
          </div>
          <div class="page-header-actions">
            <button class="pill-btn ghost" (click)="exportICal()">
              <i class="ti ti-calendar-export" aria-hidden="true"></i>
              Export Calendar
            </button>
            <button class="btn-primary" (click)="showAddForm = !showAddForm">
              <i class="ti ti-plus"></i> Schedule New
            </button>
          </div>
        </header>

        <!-- Dynamic Add Form Card -->
        <div class="glass-panel animate-scale-in" *ngIf="showAddForm" style="margin-bottom: 20px; padding: 24px;">
          <h3 class="section-title" style="font-size: 15px; margin-bottom: 12px;">Add Repair Task to Schedule</h3>
          <div class="form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="form-group">
              <label class="card-label">Select Active distress ticket</label>
              <select [(ngModel)]="newSchedule.reportId" class="glass-input">
                <option value="">Choose report...</option>
                <option *ngFor="let r of reports" [value]="r.id">{{ r.roadName }} (#{{ r.id | slice:0:6 }})</option>
              </select>
            </div>
            <div class="form-group">
              <label class="card-label">Planned Date</label>
              <input type="date" [(ngModel)]="newSchedule.scheduledDate" class="glass-input" />
            </div>
            <div class="form-group">
              <label class="card-label">Assign Contractor</label>
              <select [(ngModel)]="newSchedule.contractorName" class="glass-input">
                <option value="">Choose contractor...</option>
                <option *ngFor="let c of contractors" [value]="c.name">{{ c.name }}</option>
              </select>
            </div>
          </div>
          <div class="form-actions" style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
            <button class="btn-primary" (click)="saveSchedule()">Schedule Task</button>
            <button class="btn-secondary" (click)="showAddForm = false">Cancel</button>
          </div>
        </div>

        <div class="calendar-layout animate-fade-in-up">
          <!-- Calendar Main Grid -->
          <main class="calendar-main glass-card" style="padding: 24px;">
            <div class="calendar-nav-header">
              <h2>{{ currentMonthName }} {{ currentYear }}</h2>
              <div style="display: flex; gap: 8px;">
                <button class="btn-ghost btn-sm" (click)="prevMonth()">&larr; Prev</button>
                <button class="btn-ghost btn-sm" (click)="nextMonth()">Next &rarr;</button>
              </div>
            </div>

            <!-- Days header -->
            <div class="calendar-week-days">
              <div class="week-day-label">Sun</div>
              <div class="week-day-label">Mon</div>
              <div class="week-day-label">Tue</div>
              <div class="week-day-label">Wed</div>
              <div class="week-day-label">Thu</div>
              <div class="week-day-label">Fri</div>
              <div class="week-day-label">Sat</div>
            </div>

            <!-- Calendar Cells -->
            <div class="calendar-grid">
              <div class="calendar-cell" 
                   *ngFor="let day of calendarDays" 
                   [class.different-month]="!day.isCurrentMonth"
                   [class.selected-day]="selectedDay?.date?.toDateString() === day.date.toDateString()"
                   (click)="selectDay(day)">
                <span class="day-number">{{ day.dayNum }}</span>
                
                <!-- Color dots for scheduled jobs -->
                <div class="day-events-dots">
                  <span class="dot dot-critical" *ngIf="day.criticalCount > 0" [title]="day.criticalCount + ' critical'"></span>
                  <span class="dot dot-moderate" *ngIf="day.moderateCount > 0" [title]="day.moderateCount + ' moderate'"></span>
                  <span class="dot dot-routine" *ngIf="day.routineCount > 0" [title]="day.routineCount + ' routine'"></span>
                </div>
              </div>
            </div>
          </main>

          <!-- Right Sidebar: Day details & upcoming lists -->
          <aside class="calendar-sidebar flex-col">
            <!-- Selected Day slide-out panel -->
            <div class="glass-card day-details-panel" *ngIf="selectedDay">
              <h3>Repairs on {{ selectedDay.date | date:'mediumDate' }}</h3>
              <div class="day-repairs-list" *ngIf="selectedDay.repairs.length > 0">
                <div class="repair-item" *ngFor="let rep of selectedDay.repairs">
                  <div class="repair-meta">
                    <h4>{{ rep.roadName }}</h4>
                    <span class="repair-sub">{{ rep.assignedTeam }}</span>
                  </div>
                  <app-status-badge [status]="rep.severity" type="severity"></app-status-badge>
                </div>
              </div>
              <p class="meta text-center" *ngIf="selectedDay.repairs.length === 0">No repairs planned for this day.</p>
            </div>

            <!-- List view of all upcoming repairs -->
            <div class="glass-card upcoming-list-panel flex-col" style="flex: 1;">
              <h3>Upcoming Repairs List</h3>
              <div class="upcoming-scrollable">
                <div class="upcoming-item" *ngFor="let rep of upcomingRepairs">
                  <div class="up-meta">
                    <h4>{{ rep.roadName }}</h4>
                    <span class="up-date"><i class="ti ti-calendar"></i> {{ rep.scheduledDate | date:'mediumDate' }}</span>
                  </div>
                  <div class="up-badges">
                    <app-status-badge [status]="rep.severity" type="severity"></app-status-badge>
                    <app-sla-countdown [createdAt]="rep.createdAt" [severity]="rep.severity"></app-sla-countdown>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .flex-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-bottom: 80px;
    }

    .calendar-layout {
      display: grid;
      grid-template-columns: 2.2fr 1.2fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 900px) {
      .calendar-layout {
        grid-template-columns: 1fr;
      }
    }

    .calendar-nav-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .calendar-nav-header h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      margin: 0;
    }

    .calendar-week-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-weight: 600;
      color: var(--color-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 12px;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
    }

    .calendar-cell {
      height: 70px;
      border-radius: 12px;
      background: rgba(0,0,0,0.01);
      border: 0.5px solid rgba(0,0,0,0.04);
      padding: 8px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      cursor: pointer;
      transition: var(--transition);
    }

    .calendar-cell:hover {
      background: rgba(0,122,255,0.02);
      border-color: rgba(0,122,255,0.1);
    }

    .calendar-cell.different-month {
      opacity: 0.35;
    }

    .calendar-cell.selected-day {
      background: rgba(0,122,255,0.08);
      border-color: var(--color-primary);
    }

    .day-number {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text);
    }

    .day-events-dots {
      display: flex;
      gap: 4px;
      justify-content: flex-end;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    
    .dot-critical { background: var(--color-danger); }
    .dot-moderate { background: var(--color-warning); }
    .dot-routine { background: var(--color-success); }

    .calendar-sidebar {
      gap: 16px;
      height: 520px;
    }

    .day-details-panel, .upcoming-list-panel {
      padding: 20px;
    }

    .day-repairs-list, .upcoming-scrollable {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 12px;
    }

    .upcoming-scrollable {
      max-height: 280px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .repair-item, .upcoming-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: rgba(0,0,0,0.02);
      border-radius: 8px;
    }

    .up-meta h4, .repair-meta h4 {
      font-size: 12px;
      font-weight: 600;
      margin: 0;
    }

    .up-date, .repair-sub {
      font-size: 10px;
      color: var(--color-muted);
      margin-top: 2px;
      display: inline-block;
    }

    .up-badges {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
  `]
})
export class ScheduleCalendarComponent implements OnInit {
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();
  currentMonthName = '';

  calendarDays: CalendarDay[] = [];
  selectedDay: CalendarDay | null = null;
  upcomingRepairs: any[] = [];
  reports: any[] = [];
  contractors: any[] = [];

  showAddForm = false;
  newSchedule = {
    reportId: '',
    scheduledDate: '',
    contractorName: ''
  };

  private monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(private apiService: ApiService, private http: HttpClient, private toast: ToastService) {}

  ngOnInit() {
    this.currentMonthName = this.monthNames[this.currentMonth];
    this.loadData();
  }

  private loadData() {
    // Fetch upcoming repairs
    this.apiService.getRepairRecords().subscribe(res => {
      if (res.success && res.data) {
        // Filter repairs that have scheduled date (simulated field or repairDate as scheduled)
        this.upcomingRepairs = res.data.map((r: any) => ({
          id: r.id,
          roadName: r.roadHealthId?.roadName || 'Gotri Road distress segment',
          severity: r.citizenReportId?.priorityScore > 0.6 ? 'critical' : 'medium',
          assignedTeam: r.repairTeam,
          scheduledDate: r.repairDate,
          createdAt: r.createdAt
        })).sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

        this.generateCalendarDays();
      }
    });

    // Fetch unresolved citizen reports for Scheduling dropdown
    this.apiService.getCitizenReports(undefined, undefined, 1, 100).subscribe(res => {
      if (res.success && res.data) {
        this.reports = res.data.filter((r: any) => r.reportLifecycle !== 'fixed' && r.reportLifecycle !== 'closed').map((r: any) => ({
          id: r.id,
          roadName: r.detection?.originalFilename || 'Pothole incident'
        }));
      }
    });

    // Fetch contractors list from API
    this.http.get<{ success: boolean; data: any[] }>(`${environment.apiUrl}/contractors`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.contractors = res.data;
        }
      },
      error: () => {
        // Fallback
        this.contractors = [
          { name: 'Rajesh Constructions' },
          { name: 'Mehta Road Works' },
          { name: 'Patel Infrastructure' },
          { name: 'Vadodara RoadCare' },
          { name: 'GS Construction Co' },
          { name: 'Modi Engineers' }
        ];
      }
    });
  }

  generateCalendarDays() {
    const days: CalendarDay[] = [];
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

    // Padding for prev month days
    const startPadding = firstDay.getDay(); // 0 is Sunday
    const prevLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();

    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(this.currentYear, this.currentMonth - 1, prevLastDay - i);
      days.push(this.buildCalendarDay(d, false));
    }

    // Current month days
    const totalDays = lastDay.getDate();
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(this.currentYear, this.currentMonth, i);
      days.push(this.buildCalendarDay(d, true));
    }

    // Padding for next month days
    const totalCells = 42; // 6 rows of 7 days
    const nextPadding = totalCells - days.length;
    for (let i = 1; i <= nextPadding; i++) {
      const d = new Date(this.currentYear, this.currentMonth + 1, i);
      days.push(this.buildCalendarDay(d, false));
    }

    this.calendarDays = days;
    
    // Auto select today if in range
    const todayStr = new Date().toDateString();
    const found = days.find(d => d.date.toDateString() === todayStr);
    if (found) this.selectedDay = found;
  }

  private buildCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
    const dateStr = date.toDateString();
    
    // Find scheduled repairs on this day
    const matchingRepairs = this.upcomingRepairs.filter(r => {
      const d = new Date(r.scheduledDate);
      return d.toDateString() === dateStr;
    });

    const criticalCount = matchingRepairs.filter(r => r.severity === 'critical').length;
    const moderateCount = matchingRepairs.filter(r => r.severity === 'high' || r.severity === 'medium').length;
    const routineCount = matchingRepairs.filter(r => r.severity === 'low').length;

    return {
      dayNum: date.getDate(),
      date,
      isCurrentMonth,
      criticalCount,
      moderateCount,
      routineCount,
      repairs: matchingRepairs
    };
  }

  selectDay(day: CalendarDay) {
    this.selectedDay = day;
  }

  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.currentMonthName = this.monthNames[this.currentMonth];
    this.generateCalendarDays();
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.currentMonthName = this.monthNames[this.currentMonth];
    this.generateCalendarDays();
  }

  saveSchedule() {
    if (!this.newSchedule.reportId || !this.newSchedule.scheduledDate) return;
    
    // Mock save to schedule by updating report status to assigned and setting contractor
    this.apiService.updateReportLifecycle(
      this.newSchedule.reportId, 
      'assigned', 
      this.newSchedule.contractorName || 'Municipal Crew'
    ).subscribe(() => {
      
      // Simulate adding to scheduled repairs
      this.showAddForm = false;
      this.loadData();
    });
  }

  generateICS(events: any[]): string {
    const now = new Date()
    const dtStamp = this.formatICSDate(now)

    const eventBlocks = events.map((repair, index) => {
      const start = new Date(repair.scheduledDate)
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000) // +2 hours
      return [
        'BEGIN:VEVENT',
        `UID:roadsense-${repair._id || repair.id || index}-${Date.now()}@roadsense.ai`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${this.formatICSDate(start)}`,
        `DTEND:${this.formatICSDate(end)}`,
        `SUMMARY:Repair: ${repair.roadName} — ${repair.severity}`,
        `DESCRIPTION:Zone: ${repair.zone || ''}\\nContractor: ${repair.assignedTeam || repair.assignedContractor || ''}\\nPriority Score: ${repair.priorityScore || ''}\\nStatus: ${repair.status || ''}`,
        `LOCATION:${repair.lat || ''},${repair.lng || ''}`,
        `STATUS:${repair.status === 'complete' ? 'COMPLETED' : 'CONFIRMED'}`,
        `PRIORITY:${repair.severity === 'critical' ? '1' : repair.severity === 'moderate' ? '5' : '9'}`,
        'END:VEVENT'
      ].join('\r\n')
    })

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RoadSense AI//Smart Road Intelligence//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:RoadSense AI — Maintenance Schedule',
      'X-WR-CALDESC:Vadodara Road Repair Schedule',
      'X-WR-TIMEZONE:Asia/Kolkata',
      ...eventBlocks,
      'END:VCALENDAR'
    ].join('\r\n')
  }

  formatICSDate(date: Date): string {
    return date.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
      .replace('Z', 'Z')
  }

  exportICal() {
    const icsContent = this.generateICS(this.upcomingRepairs)
    const blob = new Blob([icsContent], {
      type: 'text/calendar;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roadsense-schedule-${new Date().toISOString().split('T')[0]}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    this.toast.success('Calendar downloaded — open in Google Calendar or Outlook');
  }
}
