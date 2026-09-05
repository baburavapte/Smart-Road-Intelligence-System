import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="login-page-container" role="main">
      
      <!-- Ambient Background Orbs -->
      <div class="bg-orb orb-1" aria-hidden="true"></div>
      <div class="bg-orb orb-2" aria-hidden="true"></div>
      <div class="bg-orb orb-3" aria-hidden="true"></div>

      <!-- Wordmark Top Section -->
      <header class="login-header animate-fade-in">
        <div class="logo-badge" aria-hidden="true">
          <span>RI</span>
        </div>
        <h1 class="logo-title">RoadSense AI</h1>
        <p class="logo-subtitle">Smart Roads. Safer Cities. Vadodara Municipal Corporation</p>
      </header>

      <!-- Role Selector Tabs -->
      <nav class="role-tabs-container" aria-label="Select login role">
        <button 
          class="role-tab" 
          [class.active]="activeTab === 'citizen'" 
          (click)="switchTab('citizen')"
        >
          <i class="ti ti-user"></i> Citizen Portal
        </button>
        <button 
          class="role-tab" 
          [class.active]="activeTab === 'officer'" 
          (click)="switchTab('officer')"
        >
          <i class="ti ti-shield"></i> Officer Portal
        </button>
        <button 
          class="role-tab" 
          [class.active]="activeTab === 'admin'" 
          (click)="switchTab('admin')"
        >
          <i class="ti ti-building-government"></i> Admin Portal
        </button>
      </nav>

      <!-- Main Login Card Wrapper -->
      <main class="login-card-wrapper">
        
        <!-- CARD 1: CITIZEN LOGIN / REGISTER -->
        <article class="portal-card glass-card citizen-border" *ngIf="activeTab === 'citizen'">
          <div class="card-hero">
            <div class="hero-icon-wrap blue-icon">
              <i class="ti" [class.ti-user]="!isRegisterMode" [class.ti-user-plus]="isRegisterMode"></i>
            </div>
            <h2 class="section-title">{{ isRegisterMode ? 'Citizen Registration' : 'Citizen Sign In' }}</h2>
            <p class="card-desc">{{ isRegisterMode ? 'Create an account to report potholes and track repairs' : 'Enter your email & password to manage your reports' }}</p>
          </div>

          <!-- Citizen Login Form -->
          <form *ngIf="!isRegisterMode" [formGroup]="citizenForm" (ngSubmit)="onCitizenLogin()" class="login-form">
            <div class="form-group">
              <label for="citizen-email" class="form-label">Email Address</label>
              <div class="input-wrapper">
                <i class="ti ti-mail input-icon"></i>
                <input type="email" id="citizen-email" formControlName="email" placeholder="citizen@test.com" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label for="citizen-pass" class="form-label">Password</label>
              <div class="input-wrapper">
                <i class="ti ti-lock input-icon"></i>
                <input [type]="showPassword ? 'text' : 'password'" id="citizen-pass" formControlName="password" placeholder="••••••••" class="form-input" />
                <button type="button" class="eye-toggle" (click)="showPassword = !showPassword">
                  <i [class]="showPassword ? 'ti ti-eye-off' : 'ti ti-eye'"></i>
                </button>
              </div>
            </div>

            <button type="submit" class="submit-button primary-blue" [disabled]="citizenLoading || citizenForm.invalid">
              <span class="spinner-inline" *ngIf="citizenLoading"></span>
              {{ citizenLoading ? 'Signing in...' : 'Sign In as Citizen' }}
            </button>

            <div class="login-error" *ngIf="citizenError">
              <i class="ti ti-alert-circle"></i> {{ citizenError }}
            </div>

            <div class="card-footer-links">
              <span class="footer-text">New here?</span>
              <a href="#" class="footer-link" (click)="toggleRegister($event)">Register Account</a>
            </div>
          </form>

          <!-- Citizen Registration Form -->
          <form *ngIf="isRegisterMode" [formGroup]="registerForm" (ngSubmit)="onRegister()" class="login-form">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <div class="input-wrapper">
                <i class="ti ti-user input-icon"></i>
                <input type="text" formControlName="name" placeholder="Test Citizen" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address</label>
              <div class="input-wrapper">
                <i class="ti ti-mail input-icon"></i>
                <input type="email" formControlName="email" placeholder="citizen@test.com" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <div class="input-wrapper">
                <i class="ti ti-lock input-icon"></i>
                <input [type]="showPassword ? 'text' : 'password'" formControlName="password" placeholder="Min 6 chars" class="form-input" />
              </div>
            </div>

            <button type="submit" class="submit-button primary-blue" [disabled]="registerLoading || registerForm.invalid">
              <span class="spinner-inline" *ngIf="registerLoading"></span>
              {{ registerLoading ? 'Creating account...' : 'Create Citizen Account' }}
            </button>

            <div class="login-error" *ngIf="registerError">
              <i class="ti ti-alert-circle"></i> {{ registerError }}
            </div>

            <div class="card-footer-links">
              <span class="footer-text">Already registered?</span>
              <a href="#" class="footer-link" (click)="toggleRegister($event)">Sign In</a>
            </div>
          </form>
        </article>

        <!-- CARD 2: OFFICER LOGIN -->
        <article class="portal-card glass-card officer-border" *ngIf="activeTab === 'officer'">
          <div class="card-hero">
            <div class="hero-icon-wrap purple-icon">
              <i class="ti ti-shield"></i>
            </div>
            <h2 class="section-title">Officer Portal</h2>
            <p class="card-desc">Government field officer login via Officer ID</p>
          </div>

          <form [formGroup]="officerForm" (ngSubmit)="onOfficerLogin()" class="login-form">
            <div class="form-group">
              <label for="officer-id" class="form-label">Officer ID</label>
              <div class="input-wrapper">
                <i class="ti ti-id input-icon"></i>
                <input type="text" id="officer-id" formControlName="officerId" placeholder="OFFICER123" class="form-input uppercase-input" />
              </div>
            </div>

            <div class="form-group">
              <label for="officer-pass" class="form-label">Password</label>
              <div class="input-wrapper">
                <i class="ti ti-lock input-icon"></i>
                <input [type]="showPassword ? 'text' : 'password'" id="officer-pass" formControlName="password" placeholder="••••••••" class="form-input" />
                <button type="button" class="eye-toggle" (click)="showPassword = !showPassword">
                  <i [class]="showPassword ? 'ti ti-eye-off' : 'ti ti-eye'"></i>
                </button>
              </div>
            </div>

            <button type="submit" class="submit-button primary-purple" [disabled]="officerLoading || officerForm.invalid">
              <span class="spinner-inline" *ngIf="officerLoading"></span>
              {{ officerLoading ? 'Authenticating...' : 'Sign In as Officer' }}
            </button>

            <div class="login-error" *ngIf="officerError">
              <i class="ti ti-alert-circle"></i> {{ officerError }}
            </div>

            <div class="card-footer-hint">
              <i class="ti ti-info-circle"></i> Contact IT Administrator if you forgot your Officer ID.
            </div>
          </form>
        </article>

        <!-- CARD 3: ADMIN LOGIN -->
        <article class="portal-card glass-card admin-border" *ngIf="activeTab === 'admin'">
          <div class="card-hero">
            <div class="hero-icon-wrap orange-icon">
              <i class="ti ti-building-government"></i>
            </div>
            <h2 class="section-title">System Admin</h2>
            <p class="card-desc">Restricted municipal government administration</p>
          </div>

          <form [formGroup]="adminForm" (ngSubmit)="onAdminLogin()" class="login-form">
            <div class="form-group">
              <label for="admin-email" class="form-label">Admin Email</label>
              <div class="input-wrapper">
                <i class="ti ti-user-check input-icon"></i>
                <input type="email" id="admin-email" formControlName="email" placeholder="admin@smartcity.gov.in" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label for="admin-pass" class="form-label">Password</label>
              <div class="input-wrapper">
                <i class="ti ti-lock input-icon"></i>
                <input [type]="showPassword ? 'text' : 'password'" id="admin-pass" formControlName="password" placeholder="••••••••" class="form-input" />
                <button type="button" class="eye-toggle" (click)="showPassword = !showPassword">
                  <i [class]="showPassword ? 'ti ti-eye-off' : 'ti ti-eye'"></i>
                </button>
              </div>
            </div>

            <button type="submit" class="submit-button primary-orange" [disabled]="adminLoading || adminForm.invalid">
              <span class="spinner-inline" *ngIf="adminLoading"></span>
              {{ adminLoading ? 'Verifying...' : 'Sign In as Admin' }}
            </button>

            <div class="login-error" *ngIf="adminError">
              <i class="ti ti-alert-circle"></i> {{ adminError }}
            </div>

            <div class="card-footer-hint">
              <i class="ti ti-lock-access"></i> Restricted access — authorized personnel only.
            </div>
          </form>
        </article>

      </main>

      <!-- Footer Section -->
      <footer class="login-footer-text">
        <p>Vadodara Municipal Corporation — Smart City Initiative</p>
        <p class="version-tag">Powered by RoadSense AI v2.0</p>

      </footer>
    </div>
  `,
  styles: [`
    .login-page-container {
      min-height: 100vh;
      width: 100%;
      background: #0A0A0F;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
    }

    .bg-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      pointer-events: none;
      opacity: 0.25;
    }

    .orb-1 { top: -100px; left: -100px; width: 450px; height: 450px; background: #007AFF; }
    .orb-2 { bottom: -100px; right: -100px; width: 450px; height: 450px; background: #5856D6; }
    .orb-3 { top: 40%; left: 50%; transform: translate(-50%, -50%); width: 300px; height: 300px; background: #FF9500; opacity: 0.12; }

    .login-header {
      text-align: center;
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }

    .logo-badge {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 16px;
      margin-bottom: 12px;
      box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
    }

    .logo-title {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 6px;
      letter-spacing: -0.5px;
    }

    .logo-subtitle {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
      margin: 0;
    }

    .role-tabs-container {
      display: flex;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px);
      padding: 6px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
      max-width: 440px;
      width: 100%;
      box-sizing: border-box;
    }

    .role-tab {
      flex: 1;
      padding: 10px 14px;
      border: none;
      border-radius: 12px;
      background: transparent;
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .role-tab:hover {
      color: rgba(255, 255, 255, 0.8);
      background: rgba(255, 255, 255, 0.04);
    }

    .role-tab.active {
      background: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .login-card-wrapper {
      width: 100%;
      max-width: 420px;
      position: relative;
      z-index: 1;
    }

    .portal-card {
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(30px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 32px 28px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      position: relative;
      overflow: hidden;
    }

    .citizen-border { border-top: 3px solid #007AFF; }
    .officer-border { border-top: 3px solid #BF5AF2; }
    .admin-border   { border-top: 3px solid #FF9500; }

    .card-hero {
      text-align: center;
      margin-bottom: 24px;
    }

    .hero-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      margin-bottom: 12px;
    }

    .blue-icon { background: rgba(0, 122, 255, 0.15); color: #007AFF; }
    .purple-icon { background: rgba(191, 90, 242, 0.15); color: #BF5AF2; }
    .orange-icon { background: rgba(255, 149, 0, 0.15); color: #FF9500; }

    .section-title {
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 4px;
    }

    .card-desc {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
      margin: 0;
      line-height: 1.4;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 14px;
      color: rgba(255, 255, 255, 0.35);
      font-size: 17px;
      pointer-events: none;
    }

    .form-input {
      width: 100%;
      padding: 12px 14px 12px 42px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      background: rgba(255, 255, 255, 0.05);
      color: #FFFFFF;
      transition: all 0.2s;
      box-sizing: border-box;
      outline: none;
    }

    .uppercase-input {
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .form-input::placeholder {
      color: rgba(255, 255, 255, 0.25);
    }

    .form-input:focus {
      border-color: rgba(0, 122, 255, 0.6);
      background: rgba(0, 122, 255, 0.06);
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
    }

    .eye-toggle {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.4);
      padding: 4px;
      font-size: 17px;
    }

    .submit-button {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 13px 24px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 14px;
      cursor: pointer;
      color: white;
      transition: all 0.2s;
      width: 100%;
    }

    .primary-blue   { background: linear-gradient(135deg, #007AFF, #0051A8); }
    .primary-purple { background: linear-gradient(135deg, #BF5AF2, #8E24AA); }
    .primary-orange { background: linear-gradient(135deg, #FF9500, #E65100); }

    .submit-button:hover:not([disabled]) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 122, 255, 0.3);
    }

    .submit-button[disabled] {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .spinner-inline {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .login-error {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #FF6961;
      font-size: 12px;
      margin-top: 10px;
      padding: 10px 14px;
      background: rgba(255, 69, 58, 0.1);
      border-radius: 10px;
      border: 1px solid rgba(255, 69, 58, 0.2);
    }

    .card-footer-links {
      margin-top: 16px;
      text-align: center;
      font-size: 13px;
    }

    .card-footer-hint {
      margin-top: 16px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .footer-text { color: rgba(255, 255, 255, 0.4); }
    .footer-link { color: #007AFF; text-decoration: none; font-weight: 600; }
    .footer-link:hover { text-decoration: underline; }

    .login-footer-text {
      text-align: center;
      margin-top: 32px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.3);
      position: relative;
      z-index: 1;
    }

    .pill-btn.ghost {
      color: rgba(255, 255, 255, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.04);
      padding: 8px 16px;
      border-radius: 20px;
      text-decoration: none;
      font-size: 12px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  activeTab: 'citizen' | 'officer' | 'admin' = 'citizen';
  isRegisterMode = false;
  showPassword = false;

  // Forms
  citizenForm: FormGroup = this.fb.group({
    email: ['citizen@test.com', [Validators.required, Validators.email]],
    password: ['citizen123', [Validators.required]]
  });

  officerForm: FormGroup = this.fb.group({
    officerId: ['OFFICER123', [Validators.required]],
    password: ['officer123', [Validators.required]]
  });

  adminForm: FormGroup = this.fb.group({
    email: ['admin@smartcity.gov.in', [Validators.required, Validators.email]],
    password: ['admin123', [Validators.required]]
  });

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  citizenLoading = false;
  citizenError = '';

  officerLoading = false;
  officerError = '';

  adminLoading = false;
  adminError = '';

  registerLoading = false;
  registerError = '';

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.redirectByRole();
      return;
    }

    this.route.queryParams.subscribe(params => {
      if (params['expired'] === 'true') {
        setTimeout(() => {
          this.toast.warning('Your session expired — please log in again');
        }, 100);
      }
    });
  }

  switchTab(tab: 'citizen' | 'officer' | 'admin') {
    this.activeTab = tab;
    this.isRegisterMode = false;
    this.citizenError = '';
    this.officerError = '';
    this.adminError = '';
    this.registerError = '';
    this.showPassword = false;
  }

  toggleRegister(event: Event) {
    event.preventDefault();
    this.isRegisterMode = !this.isRegisterMode;
    this.registerError = '';
    this.citizenError = '';
  }

  onCitizenLogin() {
    if (this.citizenForm.invalid) return;
    this.citizenLoading = true;
    this.citizenError = '';

    const { email, password } = this.citizenForm.value;
    this.authService.login({ role: 'citizen', email, password }).subscribe({
      next: (res) => {
        if (res.success || res.token || res.role) {
          this.toast.success('Signed in as Citizen');
          this.router.navigate(['/citizen/dashboard']);
        }
      },
      error: (err) => {
        this.citizenLoading = false;
        this.citizenError = err.error?.error || 'Login failed — check your credentials';
      }
    });
  }

  onOfficerLogin() {
    if (this.officerForm.invalid) return;
    this.officerLoading = true;
    this.officerError = '';

    const { officerId, password } = this.officerForm.value;
    this.authService.login({ role: 'officer', officerId, password }).subscribe({
      next: (res) => {
        if (res.success || res.role) {
          this.toast.success('Signed in as Field Officer');
          this.router.navigate(['/admin/dashboard']);
        }
      },
      error: (err) => {
        this.officerLoading = false;
        this.officerError = err.error?.error || 'Login failed — check Officer ID & password';
      }
    });
  }

  onAdminLogin() {
    if (this.adminForm.invalid) return;
    this.adminLoading = true;
    this.adminError = '';

    const { email, password } = this.adminForm.value;
    this.authService.login({ role: 'admin', email, password }).subscribe({
      next: (res) => {
        if (res.success || res.role) {
          this.toast.success('Signed in as System Admin');
          this.router.navigate(['/admin/dashboard']);
        }
      },
      error: (err) => {
        this.adminLoading = false;
        this.adminError = err.error?.error || 'Login failed — check Admin email & password';
      }
    });
  }

  onRegister() {
    if (this.registerForm.invalid) return;
    this.registerLoading = true;
    this.registerError = '';

    this.authService.register(this.registerForm.value).subscribe({
      next: (res) => {
        this.toast.success('Citizen account created!');
        this.router.navigate(['/citizen/dashboard']);
      },
      error: (err) => {
        this.registerLoading = false;
        this.registerError = err.error?.error || 'Registration failed';
      }
    });
  }

  private redirectByRole() {
    const role = this.authService.getRole() || this.authService.getUserRole();
    if (role === 'citizen') {
      this.router.navigate(['/citizen/dashboard']);
    } else {
      this.router.navigate(['/admin/dashboard']);
    }
  }
}
