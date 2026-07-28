import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private userSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  // Called on every page load to restore session
  restoreSession(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/auth/me`, { withCredentials: true }).pipe(
      tap((res: any) => {
        const userObj = res.user ? { ...res.user, role: res.role || res.user.role } : res;
        this.userSubject.next(userObj);
      }),
      catchError(() => {
        // Try sessionStorage (citizen token)
        const saved = sessionStorage.getItem('roadsense_user');
        const token = sessionStorage.getItem('roadsense_token');
        if (saved && token) {
          this.userSubject.next(JSON.parse(saved));
        } else {
          this.userSubject.next(null);
        }
        return of(null);
      })
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, credentials, { withCredentials: true }).pipe(
      tap((res: any) => {
        if (res.token) {
          sessionStorage.setItem('roadsense_token', res.token);
        }
        const userObj = { ...res.user, role: res.role };
        sessionStorage.setItem('roadsense_user', JSON.stringify(userObj));
        this.userSubject.next(userObj);
      })
    );
  }

  register(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, data, { withCredentials: true }).pipe(
      tap((res: any) => {
        if (res.token) {
          sessionStorage.setItem('roadsense_token', res.token);
        }
        const userObj = { ...res.user, role: res.role || 'citizen' };
        sessionStorage.setItem('roadsense_user', JSON.stringify(userObj));
        this.userSubject.next(userObj);
      })
    );
  }

  logout() {
    this.http.post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe();
    sessionStorage.removeItem('roadsense_token');
    sessionStorage.removeItem('roadsense_user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return sessionStorage.getItem('roadsense_token');
  }

  isLoggedIn(): boolean {
    return this.userSubject.value !== null;
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn() || !!this.getToken();
  }

  getUserRole(): string | null {
    return this.getRole();
  }

  getRole(): string | null {
    return this.userSubject.value?.role || null;
  }

  getName(): string | null {
    return this.userSubject.value?.name || null;
  }

  getUserName(): string | null {
    return this.getName();
  }

  getEmail(): string | null {
    return this.userSubject.value?.email || null;
  }

  getUserEmail(): string | null {
    return this.getEmail();
  }

  updateProfile(name: string, email: string, phone: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/profile`, { name, email, phone }, { withCredentials: true }).pipe(
      tap(res => {
        if (res.success && res.user) {
          const current = this.userSubject.value;
          if (current) {
            const updated = { ...current, name: res.user.name, email: res.user.email, phone: res.user.phone };
            this.userSubject.next(updated);
            sessionStorage.setItem('roadsense_user', JSON.stringify(updated));
          }
        }
      })
    );
  }

  updatePassword(current: string, newPass: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/password`, { current, newPass }, { withCredentials: true });
  }

  getOfficerId(): string | null {
    return this.userSubject.value?.officerId || null;
  }

  getUserId(): string | null {
    return this.userSubject.value?.id || this.userSubject.value?.userId || null;
  }
}
