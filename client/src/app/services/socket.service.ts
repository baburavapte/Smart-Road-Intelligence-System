import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private authService = inject(AuthService);
  
  private notificationSubject = new Subject<any>();
  notification$ = this.notificationSubject.asObservable();

  private connectedSubject = new BehaviorSubject<boolean>(false);
  connected$ = this.connectedSubject.asObservable();

  constructor() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  private connect() {
    if (this.socket) return;

    const token = this.authService.getToken();
    const serverUrl = environment.apiUrl.replace('/api', '');

    this.socket = io(serverUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.connectedSubject.next(true);
      console.log('🔌 Real-time WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      this.connectedSubject.next(false);
      console.log('🔌 Real-time WebSocket disconnected');
    });

    this.socket.on('notification', (data) => {
      this.notificationSubject.next(data);
    });
  }

  private disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectedSubject.next(false);
    }
  }

  emitEvent(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}
