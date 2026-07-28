import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // Clone request — always send cookies, add token if citizen
  let cloned = req.clone({ withCredentials: true });
  if (token) {
    cloned = cloned.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(cloned).pipe(
    catchError(err => {
      // Auto logout on 401
      if (err.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/me')) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
