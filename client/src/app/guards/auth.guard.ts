import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const citizenGuardFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if ((auth.isLoggedIn() || auth.isAuthenticated()) && (auth.getRole() === 'citizen' || auth.getUserRole() === 'citizen')) return true;
  router.navigate(['/login']);
  return false;
};

export const adminGuardFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.getRole() || auth.getUserRole();
  if ((auth.isLoggedIn() || auth.isAuthenticated()) && (role === 'officer' || role === 'admin')) return true;
  router.navigate(['/login']);
  return false;
};
