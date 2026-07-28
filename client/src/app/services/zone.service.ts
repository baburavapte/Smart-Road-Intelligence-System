import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Zone {
  name: string;
  label: string;
  color: string;
  boundary: any; // GeoJSON Polygon
}

export interface ZoneResult {
  success: boolean;
  zone: string;
  label: string;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZoneService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getZones(): Observable<Zone[]> {
    return this.http.get<{ success: boolean; data: Zone[] }>(`${this.apiUrl}/zones`).pipe(
      map(res => res.data)
    );
  }

  detectZone(lat: number, lng: number): Observable<ZoneResult> {
    return this.http.post<ZoneResult>(`${this.apiUrl}/zones/detect`, { lat, lng });
  }
}
