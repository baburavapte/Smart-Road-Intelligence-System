import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

function passwordMatchValidator(group: AbstractControl) {
  const newPass = group.get('newPass')?.value;
  const confirm = group.get('confirm')?.value;
  return newPass === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container container animate-fade-in-up">
      <div class="profile-layout">
        
        <!-- Profile Details Card -->
        <div class="glass-card profile-card">
          <div class="card-header">
            <h2>Personal Profile</h2>
            <p class="subtitle">Manage your personal identification details.</p>
          </div>
          
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
            <div class="form-group">
              <label class="form-label" for="name">Full Name</label>
              <input 
                id="name" 
                type="text" 
                class="form-input" 
                formControlName="name"
                placeholder="Enter your full name"
              >
              <span class="field-error" *ngIf="profileForm.get('name')?.invalid && profileForm.get('name')?.touched">
                <i class="ti ti-alert-circle" aria-hidden="true"></i>
                Name is required (min 2 characters, max 60).
              </span>
            </div>

            <div class="form-group">
              <label class="form-label" for="email">Email Address</label>
              <input 
                id="email" 
                type="email" 
                class="form-input" 
                formControlName="email"
                placeholder="email@example.com"
              >
              <span class="field-error" *ngIf="profileForm.get('email')?.invalid && profileForm.get('email')?.touched">
                <i class="ti ti-alert-circle" aria-hidden="true"></i>
                Enter a valid email address.
              </span>
            </div>

            <div class="form-group">
              <label class="form-label" for="phone">Phone Number</label>
              <input 
                id="phone" 
                type="text" 
                class="form-input" 
                formControlName="phone"
                placeholder="e.g. 9876543210"
              >
              <span class="field-error" *ngIf="profileForm.get('phone')?.invalid && profileForm.get('phone')?.touched">
                <i class="ti ti-alert-circle" aria-hidden="true"></i>
                Enter a valid 10-digit mobile number starting with 6-9.
              </span>
            </div>

            <div class="form-actions">
              <button type="submit" [disabled]="profileForm.invalid || savingProfile" class="pill-btn primary">
                <i class="ti ti-device-floppy" aria-hidden="true"></i>
                {{ savingProfile ? 'Saving...' : 'Save Profile' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Change Password Card -->
        <div class="glass-card profile-card">
          <div class="card-header">
            <h2>Change Password</h2>
            <p class="subtitle">Change your security password regularly to protect your account.</p>
          </div>

          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
            <div class="form-group">
              <label class="form-label" for="current">Current Password</label>
              <input 
                id="current" 
                type="password" 
                class="form-input" 
                formControlName="current"
                placeholder="••••••••"
              >
              <span class="field-error" *ngIf="passwordForm.get('current')?.invalid && passwordForm.get('current')?.touched">
                <i class="ti ti-alert-circle" aria-hidden="true"></i>
                Current password is required.
              </span>
            </div>

            <div class="form-group">
              <label class="form-label" for="newPass">New Password</label>
              <input 
                id="newPass" 
                type="password" 
                class="form-input" 
                formControlName="newPass"
                placeholder="••••••••"
                (input)="checkPasswordStrength()"
              >
              <span class="field-error" *ngIf="passwordForm.get('newPass')?.invalid && passwordForm.get('newPass')?.touched">
                <i class="ti ti-alert-circle" aria-hidden="true"></i>
                Password must be at least 8 characters and contain a letter and a number.
              </span>

              <!-- Password Strength Bar -->
              <div class="strength-indicator-wrapper" *ngIf="passwordForm.get('newPass')?.value">
                <div class="strength-bar" [class]="strength">
                  <div class="strength-segment"></div>
                  <div class="strength-segment"></div>
                  <div class="strength-segment"></div>
                </div>
                <span class="strength-label">Password: <strong [class]="strength">{{ strength | titlecase }}</strong></span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="confirm">Confirm Password</label>
              <input 
                id="confirm" 
                type="password" 
                class="form-input" 
                formControlName="confirm"
                placeholder="••••••••"
              >
              <span class="field-error" *ngIf="passwordForm.errors?.['passwordMismatch'] && passwordForm.get('confirm')?.touched">
                <i class="ti ti-alert-circle" aria-hidden="true"></i>
                Passwords do not match.
              </span>
            </div>

            <div class="form-actions">
              <button type="submit" [disabled]="passwordForm.invalid || savingPassword" class="pill-btn danger-btn">
                <i class="ti ti-lock" aria-hidden="true"></i>
                {{ savingPassword ? 'Changing...' : 'Change Password' }}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .profile-layout {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      margin-top: 20px;
    }
    .profile-card {
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .card-header h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1D1D1F;
      margin: 0 0 6px 0;
    }
    .card-header .subtitle {
      font-size: 0.9rem;
      color: #6E6E73;
      margin: 0;
    }
    .form-actions {
      margin-top: 24px;
    }
    .danger-btn {
      background: var(--color-danger, #FF453A);
      color: #fff;
      border: none;
    }
    .danger-btn:hover:not([disabled]) {
      background: #FF3B30;
      box-shadow: 0 4px 15px rgba(255, 69, 58, 0.4);
    }
    
    /* Password Strength Indicator */
    .strength-indicator-wrapper {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .strength-bar {
      display: flex;
      gap: 4px;
      height: 4px;
      width: 100%;
    }
    .strength-segment {
      flex: 1;
      background: rgba(0, 0, 0, 0.08);
      border-radius: 2px;
      transition: background 0.3s ease;
    }
    
    /* Weak: 1st bar red */
    .strength-bar.weak .strength-segment:nth-child(1) { background: #FF453A; }
    
    /* Medium: 1st & 2nd bar yellow */
    .strength-bar.medium .strength-segment:nth-child(1),
    .strength-bar.medium .strength-segment:nth-child(2) { background: #FFD60A; }
    
    /* Strong: All bars green */
    .strength-bar.strong .strength-segment { background: #30D158; }

    .strength-label {
      font-size: 11px;
      color: #6E6E73;
    }
    .strength-label strong.weak { color: #FF453A; }
    .strength-label strong.medium { color: #FF9F0A; }
    .strength-label strong.strong { color: #30D158; }
  `]
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  
  savingProfile = false;
  savingPassword = false;
  strength: 'weak' | 'medium' | 'strong' = 'weak';

  ngOnInit() {
    this.initForms();
    this.loadUserData();
  }

  private initForms() {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[6-9]\d{9}$/)]]
    });

    this.passwordForm = this.fb.group({
      current: ['', Validators.required],
      newPass: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
      ]],
      confirm: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  private loadUserData() {
    const name = this.authService.getUserName() || '';
    const email = this.authService.getUserEmail() || '';

    // Let's populate name and email immediately
    this.profileForm.patchValue({ name, email });
    
    // In our auth/me restore payload, phone might not be decoded, so we prefill it with whatever is stored in memory
    const userJson = sessionStorage.getItem('roadsense_user');
    if (userJson) {
      try {
        const parsed = JSON.parse(userJson);
        if (parsed.phone) {
          this.profileForm.patchValue({ phone: parsed.phone });
        }
      } catch (e) {}
    }
  }

  checkPasswordStrength() {
    const val = this.passwordForm.get('newPass')?.value || '';
    if (!val) {
      this.strength = 'weak';
      return;
    }

    const hasUppercase = /[A-Z]/.test(val);
    const hasNumber = /\d/.test(val);
    const hasSymbol = /[^A-Za-z0-9]/.test(val);
    
    if (val.length >= 12 && hasUppercase && hasNumber && hasSymbol) {
      this.strength = 'strong';
    } else if (val.length >= 8 && hasNumber) {
      this.strength = 'medium';
    } else {
      this.strength = 'weak';
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) return;
    this.savingProfile = true;

    const { name, email, phone } = this.profileForm.value;
    this.authService.updateProfile(name, email, phone).subscribe({
      next: () => {
        this.toast.success('Profile updated successfully');
        this.savingProfile = false;
      },
      error: () => {
        this.toast.error('Failed to save changes');
        this.savingProfile = false;
      }
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;
    this.savingPassword = true;

    const { current, newPass } = this.passwordForm.value;
    this.authService.updatePassword(current, newPass).subscribe({
      next: () => {
        this.toast.success('Password changed — please log in again');
        this.savingPassword = false;
        setTimeout(() => {
          this.authService.logout();
        }, 1500);
      },
      error: (err: any) => {
        this.toast.error(err.error?.error || 'Failed to change password');
        this.savingPassword = false;
      }
    });
  }
}
