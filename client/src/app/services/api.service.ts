import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Detection {
    id: string;
    fileId: string;
    originalImage: string;
    annotatedImage: string;
    originalFilename: string;
    potholeCount: number;
    severity: string;
    detections: DetectionBox[];
    imageDimensions: { width: number; height: number };
    createdAt: string;
}

export interface DetectionBox {
    bbox: { x1: number; y1: number; x2: number; y2: number };
    confidence: number;
    classId: number;
    className: string;
}

export interface DetectionResponse {
    success: boolean;
    detection: Detection;
}

export interface DetectionsListResponse {
    success: boolean;
    data: Detection[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface StatsResponse {
    success: boolean;
    stats: {
        totalDetections: number;
        totalPotholes: number;
        avgPotholesPerImage: number;
        severityDistribution: { [key: string]: number };
        dailyDetections: { _id: string; count: number; potholes: number }[];
        recentDetections: any[];
    };
}

export interface AdminStatsResponse {
    success: boolean;
    stats: {
        totalReports: number;
        fixedReports: number;
        pendingReports: number;
        criticalPotholes: number;
        statusDistribution: { [key: string]: number };
        severityDistribution: { [key: string]: number };
    };
}

export interface NearRouteResponse {
    success: boolean;
    data: {
        id: string;
        severity: string;
        potholeCount: number;
        location: { type: string; coordinates: number[] };
        originalFilename: string;
        annotatedImage: string;
        createdAt: string;
    }[];
    total: number;
}

export interface AdminDetection {
    id: string;
    fileId: string;
    originalImage: string;
    annotatedImage: string;
    originalFilename: string;
    potholeCount: number;
    severity: string;
    reportStatus: string;
    location: any;
    createdAt: string;
}

export interface AdminDetectionsResponse {
    success: boolean;
    data: AdminDetection[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    detectPotholes(imageFile: File, latitude?: number, longitude?: number): Observable<DetectionResponse> {
        const formData = new FormData();
        formData.append('image', imageFile);
        if (latitude !== undefined && longitude !== undefined) {
            formData.append('latitude', latitude.toString());
            formData.append('longitude', longitude.toString());
        }
        return this.http.post<DetectionResponse>(`${this.apiUrl}/detect`, formData);
    }

    getGeoJSON(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/detections/geojson`);
    }

    getDetections(page: number = 1, limit: number = 20): Observable<DetectionsListResponse> {
        return this.http.get<DetectionsListResponse>(
            `${this.apiUrl}/detections?page=${page}&limit=${limit}`
        );
    }

    getDetection(id: string): Observable<{ success: boolean; detection: Detection }> {
        return this.http.get<{ success: boolean; detection: Detection }>(
            `${this.apiUrl}/detections/${id}`
        );
    }

    getStats(): Observable<StatsResponse> {
        return this.http.get<StatsResponse>(`${this.apiUrl}/stats`);
    }

    deleteDetection(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/detections/${id}`);
    }


    healthCheck(): Observable<any> {
        return this.http.get(`${this.apiUrl}/health`);
    }

    // ===== New API methods for Route Safety, Admin Dashboard =====

    getNearRoute(coordinates: number[][], radius: number = 500): Observable<NearRouteResponse> {
        return this.http.post<NearRouteResponse>(`${this.apiUrl}/detections/near-route`, {
            coordinates,
            radius
        });
    }

    getAdminStats(): Observable<AdminStatsResponse> {
        return this.http.get<AdminStatsResponse>(`${this.apiUrl}/admin/stats`);
    }

    getAdminDetections(
        page: number = 1,
        limit: number = 20,
        filters: { status?: string; severity?: string; dateFrom?: string; dateTo?: string } = {}
    ): Observable<AdminDetectionsResponse> {
        let params = `page=${page}&limit=${limit}`;
        if (filters.status) params += `&status=${filters.status}`;
        if (filters.severity) params += `&severity=${filters.severity}`;
        if (filters.dateFrom) params += `&dateFrom=${filters.dateFrom}`;
        if (filters.dateTo) params += `&dateTo=${filters.dateTo}`;
        return this.http.get<AdminDetectionsResponse>(`${this.apiUrl}/admin/detections?${params}`);
    }

    updateReportStatus(id: string, reportStatus: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/detections/${id}/status`, { reportStatus });
    }

    // ===== Citizen-to-Government Reporting System APIs =====

    submitCitizenReport(report: {
        detectionId: string;
        reporterName?: string;
        reporterEmail?: string;
        reporterPhone?: string;
        description?: string;
    }): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/citizen/reports`, report);
    }

    getCitizenReports(email?: string, lifecycle?: string, page: number = 1, limit: number = 20, extraParams?: any): Observable<any> {
        let params = `page=${page}&limit=${limit}`;
        if (email) params += `&email=${email}`;
        if (lifecycle) params += `&lifecycle=${lifecycle}`;
        if (extraParams) {
            Object.keys(extraParams).forEach(k => {
                if (extraParams[k] != null && extraParams[k] !== '') {
                    params += `&${k}=${encodeURIComponent(extraParams[k])}`;
                }
            });
        }
        return this.http.get<any>(`${this.apiUrl}/citizen/reports?${params}`);
    }

    getCitizenReport(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/citizen/reports/${id}`);
    }

    updateReportLifecycle(id: string, lifecycle: string, assignedTeam?: string): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/citizen/reports/${id}/lifecycle`, { lifecycle, assignedTeam });
    }

    getCitizenReportStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/citizen/reports/stats`);
    }

    // ===== Road Health Index & Forecasting & Priority APIs =====

    getRoadHealth(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/road-health`);
    }

    getRoadHealthDetail(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/road-health/${id}`);
    }

    createRoad(roadName: string, boundingBox: {
        minLat: number; maxLat: number;
        minLng: number; maxLng: number;
    }): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/road-health/roads`, { roadName, boundingBox });
    }

    calculateRoadHealth(): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/road-health/calculate`, {});
    }

    getRoadHealthGeoJSON(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/road-health/geojson`);
    }

    getRoadForecast(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/road-health/${id}/forecast`);
    }

    getCriticalForecasts(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/road-health/forecast/critical`);
    }

    getRoadPriority(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/road-health/priority`);
    }

    // ===== Repair Proof & Transparency APIs =====

    submitRepairProof(formData: FormData): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/repair`, formData);
    }

    getRepairRecords(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/repair`);
    }

    getRepairByReport(reportId: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/repair/by-report/${reportId}`);
    }

    verifyRepair(id: string, verified: boolean): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/repair/${id}/verify`, { verified });
    }

    // ===== Citizen Notification Center APIs =====

    getNotifications(email: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/notifications?email=${email}`);
    }

    getUnreadNotificationsCount(email: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/notifications/unread-count?email=${email}`);
    }

    markNotificationAsRead(id: string): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/notifications/${id}/read`, {});
    }

    markAllNotificationsAsRead(email: string): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/notifications/read-all`, { email });
    }

    // ===== Route safety planner using public OSRM + local pothole coordinates =====

    planRoute(start: number[], end: number[]): Observable<any> {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&alternatives=true`;
        
        return this.http.get<any>(osrmUrl).pipe(
            switchMap(osrmRes => {
                if (!osrmRes || !osrmRes.routes || osrmRes.routes.length === 0) {
                    return of({ success: false, routes: [] });
                }

                const routeRequests = osrmRes.routes.map((route: any) => {
                    const coords = route.geometry.coordinates; // [[lng, lat], ...]
                    
                    return this.getNearRoute(coords, 300).pipe(
                        map(nearRes => {
                            const potholes = nearRes.success ? nearRes.data : [];
                            const totalPotholes = potholes.length;
                            
                            let totalRiskWeight = 0;
                            potholes.forEach((p: any) => {
                                const sev = (p.severity || 'low').toLowerCase();
                                if (sev === 'critical') totalRiskWeight += 4;
                                else if (sev === 'high') totalRiskWeight += 3;
                                else if (sev === 'medium') totalRiskWeight += 2;
                                else totalRiskWeight += 1;
                            });

                            const safetyPercentage = Math.max(0, 100 - (totalRiskWeight * 5));
                            const riskScore = totalPotholes > 0 ? (totalRiskWeight / totalPotholes) : 0;
                            const avgSeverity = totalPotholes > 0 ? (totalRiskWeight / totalPotholes) : 0;
                            
                            let avgSeverityLabel = 'none';
                            if (avgSeverity >= 3.5) avgSeverityLabel = 'critical';
                            else if (avgSeverity >= 2.5) avgSeverityLabel = 'high';
                            else if (avgSeverity >= 1.5) avgSeverityLabel = 'medium';
                            else if (avgSeverity > 0) avgSeverityLabel = 'low';

                            return {
                                coordinates: coords,
                                distance: route.distance,
                                duration: route.duration,
                                potholes: potholes,
                                totalPotholes: totalPotholes,
                                safetyPercentage: Math.round(safetyPercentage),
                                riskScore: Math.round(riskScore * 10) / 10,
                                avgSeverity: Math.round(avgSeverity * 10) / 10,
                                avgSeverityLabel: avgSeverityLabel
                            };
                        }),
                        catchError(() => {
                            return of({
                                coordinates: coords,
                                distance: route.distance,
                                duration: route.duration,
                                potholes: [],
                                totalPotholes: 0,
                                safetyPercentage: 100,
                                riskScore: 0,
                                avgSeverity: 0,
                                avgSeverityLabel: 'none'
                            });
                        })
                    );
                });

                return forkJoin(routeRequests).pipe(
                    map(processedRoutes => ({
                        success: true,
                        routes: processedRoutes
                    }))
                );
            }),
            catchError(err => {
                console.error('OSRM route planning error:', err);
                return of({ success: false, error: 'OSRM routing service failed.' });
            })
        );
    }

    // ── User Management (Admin) ────────────────────────────────────
    getUsers(page: number = 1, limit: number = 20, role?: string, search?: string): Observable<any> {
        let params: any = { page, limit };
        if (role) params.role = role;
        if (search) params.search = search;
        return this.http.get<any>(`${this.apiUrl}/users`, { params, withCredentials: true });
    }

    updateUserRole(userId: string, role: string): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/users/${userId}/role`, { role }, { withCredentials: true });
    }

    updateUserActive(userId: string, isActive: boolean): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/users/${userId}/active`, { isActive }, { withCredentials: true });
    }
}

