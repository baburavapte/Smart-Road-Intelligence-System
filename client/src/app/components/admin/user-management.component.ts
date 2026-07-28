import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1 class="page-title">
            <i class="ti ti-users-group" aria-hidden="true"></i>
            User Management
          </h1>
          <p class="page-subtitle">Manage user roles and access across the platform</p>
        </div>
        <div class="header-stats">
          <div class="stat-chip">
            <span class="stat-value">{{ totalUsers }}</span>
            <span class="stat-label">Total Users</span>
          </div>
          <div class="stat-chip officer-chip">
            <span class="stat-value">{{ officerCount }}</span>
            <span class="stat-label">Officers</span>
          </div>
          <div class="stat-chip citizen-chip">
            <span class="stat-value">{{ citizenCount }}</span>
            <span class="stat-label">Citizens</span>
          </div>
        </div>
      </header>

      <!-- Filters Bar -->
      <div class="filters-bar glass-card">
        <div class="search-wrapper">
          <i class="ti ti-search" aria-hidden="true"></i>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            [(ngModel)]="searchQuery"
            (input)="onSearchChange()"
            class="search-input"
            id="user-search"
          />
        </div>
        <div class="filter-pills">
          <button 
            class="filter-pill" 
            [class.active]="roleFilter === ''"
            (click)="setRoleFilter('')"
          >All</button>
          <button 
            class="filter-pill" 
            [class.active]="roleFilter === 'citizen'"
            (click)="setRoleFilter('citizen')"
          >
            <i class="ti ti-user" aria-hidden="true"></i> Citizens
          </button>
          <button 
            class="filter-pill" 
            [class.active]="roleFilter === 'officer'"
            (click)="setRoleFilter('officer')"
          >
            <i class="ti ti-building-community" aria-hidden="true"></i> Officers
          </button>
          <button 
            class="filter-pill" 
            [class.active]="roleFilter === 'admin'"
            (click)="setRoleFilter('admin')"
          >
            <i class="ti ti-shield-check" aria-hidden="true"></i> Admins
          </button>
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div class="users-table-card glass-card" *ngIf="loading">
        <div class="skeleton-row" *ngFor="let i of [1,2,3,4,5]">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-lines">
            <div class="skeleton-line" style="width: 40%"></div>
            <div class="skeleton-line short" style="width: 60%"></div>
          </div>
          <div class="skeleton-line" style="width: 80px"></div>
          <div class="skeleton-line" style="width: 100px"></div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="users-table-card glass-card" *ngIf="!loading">
        <div class="table-responsive">
          <table class="users-table" *ngIf="users.length > 0">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users" [class.inactive-row]="!user.isActive">
                <td class="user-cell">
                  <div class="user-avatar" [class]="'avatar-' + user.role">
                    {{ getInitials(user.name) }}
                  </div>
                  <div>
                    <div class="user-name">{{ user.name }}</div>
                    <div class="user-id" *ngIf="user.officerId">ID: {{ user.officerId }}</div>
                  </div>
                </td>
                <td class="email-cell">{{ user.email || '—' }}</td>
                <td>
                  <select 
                    class="role-select"
                    [class]="'role-' + user.role"
                    [value]="user.role"
                    (change)="onRoleChange(user, $event)"
                    [disabled]="user._id === currentUserId"
                  >
                    <option value="citizen">Citizen</option>
                    <option value="officer">Officer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <button 
                    class="status-toggle"
                    [class.active-status]="user.isActive"
                    [class.inactive-status]="!user.isActive"
                    (click)="toggleActive(user)"
                    [disabled]="user._id === currentUserId"
                    [title]="user._id === currentUserId ? 'Cannot change your own status' : (user.isActive ? 'Deactivate user' : 'Activate user')"
                  >
                    <span class="toggle-dot"></span>
                    <span class="toggle-label">{{ user.isActive ? 'Active' : 'Inactive' }}</span>
                  </button>
                </td>
                <td class="login-cell">
                  <span *ngIf="user.loginHistory?.length > 0">
                    {{ formatDate(user.loginHistory[0].timestamp) }}
                  </span>
                  <span class="never-logged" *ngIf="!user.loginHistory?.length">Never</span>
                </td>
                <td>
                  <span class="self-badge" *ngIf="user._id === currentUserId">You</span>
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Empty State -->
          <div class="empty-state" *ngIf="users.length === 0">
            <i class="ti ti-users-minus" aria-hidden="true"></i>
            <p>No users found matching your filters</p>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-bar" *ngIf="pagination.pages > 1">
          <button 
            class="page-btn" 
            [disabled]="pagination.page <= 1"
            (click)="goToPage(pagination.page - 1)"
          >
            <i class="ti ti-chevron-left" aria-hidden="true"></i>
          </button>
          <span class="page-info">Page {{ pagination.page }} of {{ pagination.pages }}</span>
          <button 
            class="page-btn" 
            [disabled]="pagination.page >= pagination.pages"
            (click)="goToPage(pagination.page + 1)"
          >
            <i class="ti ti-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 32px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .page-title {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 6px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .page-title .ti {
      color: var(--color-primary);
    }

    .page-subtitle {
      font-size: 14px;
      color: var(--color-muted);
      margin: 0;
    }

    .header-stats {
      display: flex;
      gap: 12px;
    }

    .stat-chip {
      background: rgba(0, 122, 255, 0.08);
      border: 1px solid rgba(0, 122, 255, 0.15);
      border-radius: 14px;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 70px;
    }

    .stat-chip.officer-chip {
      background: rgba(191, 90, 242, 0.08);
      border-color: rgba(191, 90, 242, 0.15);
    }

    .stat-chip.citizen-chip {
      background: rgba(48, 209, 88, 0.08);
      border-color: rgba(48, 209, 88, 0.15);
    }

    .stat-value {
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: var(--color-text);
    }

    .stat-label {
      font-size: 11px;
      color: var(--color-muted);
      font-weight: 500;
    }

    /* Filters Bar */
    .filters-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 18px;
      margin-bottom: 20px;
      border-radius: 16px;
      flex-wrap: wrap;
    }

    .search-wrapper {
      position: relative;
      flex: 1;
      min-width: 200px;
    }

    .search-wrapper .ti {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-muted);
      font-size: 16px;
    }

    .search-input {
      width: 100%;
      padding: 10px 14px 10px 38px;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      background: var(--color-surface);
      color: var(--color-text);
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .search-input:focus {
      border-color: var(--color-primary);
    }

    .filter-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-pill {
      padding: 8px 14px;
      border-radius: 20px;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-muted);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 5px;
      font-family: 'Inter', sans-serif;
    }

    .filter-pill:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .filter-pill.active {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    /* Table Card */
    .users-table-card {
      border-radius: 18px;
      overflow: hidden;
      padding: 0;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    .users-table thead th {
      padding: 14px 18px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      background: rgba(0, 0, 0, 0.01);
      font-family: 'Inter', sans-serif;
    }

    .users-table tbody tr {
      transition: background 0.15s;
    }

    .users-table tbody tr:hover {
      background: rgba(0, 122, 255, 0.03);
    }

    .users-table tbody tr.inactive-row {
      opacity: 0.55;
    }

    .users-table tbody td {
      padding: 14px 18px;
      font-size: 14px;
      color: var(--color-text);
      border-bottom: 1px solid rgba(0, 0, 0, 0.04);
      vertical-align: middle;
      font-family: 'Inter', sans-serif;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 14px;
      color: white;
      flex-shrink: 0;
    }

    .avatar-citizen { background: linear-gradient(135deg, #30D158, #34C759); }
    .avatar-officer { background: linear-gradient(135deg, #BF5AF2, #AF52DE); }
    .avatar-admin   { background: linear-gradient(135deg, #FF9F0A, #FF9500); }

    .user-name {
      font-weight: 600;
      font-size: 14px;
    }

    .user-id {
      font-size: 11px;
      color: var(--color-muted);
      margin-top: 2px;
    }

    .email-cell {
      color: var(--color-muted);
      font-size: 13px;
    }

    /* Role Select */
    .role-select {
      padding: 6px 28px 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--color-border);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236E6E73' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 14px;
      transition: all 0.2s;
      font-family: 'Inter', sans-serif;
    }

    .role-select:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.12);
    }

    .role-select:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .role-citizen {
      background-color: rgba(48, 209, 88, 0.08);
      color: #30D158;
      border-color: rgba(48, 209, 88, 0.2);
    }

    .role-officer {
      background-color: rgba(191, 90, 242, 0.08);
      color: #BF5AF2;
      border-color: rgba(191, 90, 242, 0.2);
    }

    .role-admin {
      background-color: rgba(255, 159, 10, 0.08);
      color: #FF9F0A;
      border-color: rgba(255, 159, 10, 0.2);
    }

    /* Status Toggle */
    .status-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 20px;
      border: none;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.25s;
      font-family: 'Inter', sans-serif;
    }

    .status-toggle:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .active-status {
      background: rgba(48, 209, 88, 0.1);
      color: #30D158;
    }

    .active-status .toggle-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #30D158;
      box-shadow: 0 0 6px rgba(48, 209, 88, 0.4);
    }

    .inactive-status {
      background: rgba(255, 69, 58, 0.08);
      color: #FF453A;
    }

    .inactive-status .toggle-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #FF453A;
    }

    .login-cell {
      font-size: 13px;
      color: var(--color-muted);
    }

    .never-logged {
      color: rgba(0, 0, 0, 0.2);
      font-style: italic;
    }

    .self-badge {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-primary);
      background: rgba(0, 122, 255, 0.08);
      padding: 3px 10px;
      border-radius: 6px;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--color-muted);
    }

    .empty-state .ti {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.3;
    }

    .empty-state p {
      font-size: 14px;
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 16px;
      border-top: 1px solid var(--color-border);
    }

    .page-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .page-btn:hover:not([disabled]) {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .page-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .page-info {
      font-size: 13px;
      color: var(--color-muted);
      font-weight: 500;
    }

    /* Skeleton Loading */
    .skeleton-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }

    .skeleton-avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      flex-shrink: 0;
    }

    .skeleton-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .skeleton-line {
      height: 12px;
      border-radius: 6px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .skeleton-line.short {
      height: 10px;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @media (max-width: 768px) {
      .page-container { padding: 16px; }
      .page-header { flex-direction: column; }
      .header-stats { width: 100%; }
      .users-table thead { display: none; }
      .users-table tbody tr {
        display: block;
        padding: 12px;
        margin-bottom: 8px;
        border: 1px solid var(--color-border);
        border-radius: 12px;
      }
      .users-table tbody td {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border: none;
      }
    }
  `]
})
export class UserManagementComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  users: any[] = [];
  loading = true;
  searchQuery = '';
  roleFilter = '';
  currentUserId = '';

  totalUsers = 0;
  officerCount = 0;
  citizenCount = 0;

  pagination = {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  };

  private searchTimeout: any;

  ngOnInit() {
    this.currentUserId = this.auth.getUserId() || '';
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.api.getUsers(this.pagination.page, this.pagination.limit, this.roleFilter || undefined, this.searchQuery || undefined)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.users = res.data;
            this.pagination = res.pagination;
            this.totalUsers = res.pagination.total;
            // Count roles from all data (approximate from current page if no filter)
            if (!this.roleFilter) {
              this.officerCount = this.users.filter((u: any) => u.role === 'officer').length;
              this.citizenCount = this.users.filter((u: any) => u.role === 'citizen').length;
            }
            // Load full counts separately
            this.loadCounts();
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.toast.error('Failed to load users');
        }
      });
  }

  loadCounts() {
    // Get total counts for each role
    this.api.getUsers(1, 1, 'officer').subscribe(res => {
      if (res.success) this.officerCount = res.pagination.total;
    });
    this.api.getUsers(1, 1, 'citizen').subscribe(res => {
      if (res.success) this.citizenCount = res.pagination.total;
    });
    this.api.getUsers(1, 1).subscribe(res => {
      if (res.success) this.totalUsers = res.pagination.total;
    });
  }

  onSearchChange() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.pagination.page = 1;
      this.loadUsers();
    }, 400);
  }

  setRoleFilter(role: string) {
    this.roleFilter = role;
    this.pagination.page = 1;
    this.loadUsers();
  }

  goToPage(page: number) {
    this.pagination.page = page;
    this.loadUsers();
  }

  onRoleChange(user: any, event: Event) {
    const newRole = (event.target as HTMLSelectElement).value;
    const previousRole = user.role;

    this.api.updateUserRole(user._id, newRole).subscribe({
      next: (res) => {
        if (res.success) {
          user.role = newRole;
          this.toast.success(`${user.name} is now ${newRole}`);
          this.loadCounts();
        }
      },
      error: (err) => {
        // Revert the select
        (event.target as HTMLSelectElement).value = previousRole;
        this.toast.error(err.error?.error || 'Failed to update role');
      }
    });
  }

  toggleActive(user: any) {
    if (user._id === this.currentUserId) return;

    const newStatus = !user.isActive;
    this.api.updateUserActive(user._id, newStatus).subscribe({
      next: (res) => {
        if (res.success) {
          user.isActive = newStatus;
          this.toast.success(`${user.name} ${newStatus ? 'activated' : 'deactivated'}`);
        }
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to update status');
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
