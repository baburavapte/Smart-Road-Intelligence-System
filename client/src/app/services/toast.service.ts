import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  show(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration = 3500
  ) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: Toast = { id, message, type, duration, visible: true };

    this.toastsSubject.next([...this.toastsSubject.value, toast]);

    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: string) {
    const toasts = this.toastsSubject.value.map(t =>
      t.id === id ? { ...t, visible: false } : t
    );
    this.toastsSubject.next(toasts);
    setTimeout(() => {
      this.toastsSubject.next(
        this.toastsSubject.value.filter(t => t.id !== id)
      );
    }, 350);
  }

  success(message: string) { this.show(message, 'success'); }
  error(message: string)   { this.show(message, 'error', 5000); }
  warning(message: string) { this.show(message, 'warning', 4500); }
  info(message: string)    { this.show(message, 'info'); }
}
