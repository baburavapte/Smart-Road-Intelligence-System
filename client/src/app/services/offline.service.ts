import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  isOnline$ = this.onlineSubject.asObservable();

  constructor() {
    window.addEventListener('online', () => {
      this.onlineSubject.next(true);
    });
    window.addEventListener('offline', () => {
      this.onlineSubject.next(false);
    });
  }

  get isOnline(): boolean {
    return this.onlineSubject.value;
  }
}
