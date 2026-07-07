import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import * as L from 'leaflet';

@Component({
    selector: 'app-detect',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-container small-container">
      <!-- Header -->
      <header class="page-header animate-fade-in">
        <div class="page-header-text text-center">
          <h1 class="page-title">Run AI Detection</h1>
          <p class="page-header-subtitle">Analyze road surfaces using our trained YOLOv8 model</p>
        </div>
      </header>

      <!-- Main Upload Box Section -->
      <div class="upload-container animate-fade-in-up" style="animation-delay: 0.05s">
        <div 
          class="upload-area glass-card" 
          [class.dragover]="isDragover"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          <input 
            type="file" 
            #fileInput 
            (change)="onFileSelected($event)" 
            aria-label="Upload road image"
            accept="image/jpeg, image/png, image/jpg, image/webp" 
            style="display: none"
          >
          
          <!-- Empty upload placeholder -->
          <div *ngIf="!selectedFile && !previewUrl" class="upload-placeholder">
            <div class="upload-icon-box bg-blue-tint">
              <i class="ti ti-cloud-upload" aria-hidden="true"></i>
            </div>
            <h3>Drag & Drop an image here</h3>
            <p>or click to browse local files</p>
            <span class="upload-note">Supports JPG, PNG, WebP (Max 50MB)</span>
            
            <div class="sample-btn-box" (click)="$event.stopPropagation()">
              <button id="btn-use-sample" class="btn-secondary" (click)="loadSampleImage($event)">
                <i class="ti ti-photo" aria-hidden="true"></i> Use Sample Image
              </button>
            </div>
          </div>

          <!-- Preview image selection -->
          <div *ngIf="previewUrl" class="image-preview-container animate-scale-in">
            <img [src]="previewUrl" alt="Pothole detection preview" class="preview-img">
            <div class="preview-overlay">
              <button class="btn-change-img btn-secondary" (click)="clearSelection($event)">
                <i class="ti ti-refresh" aria-hidden="true"></i> Change Image
              </button>
            </div>
          </div>
        </div>

        <!-- Location Pin Drop Section -->
        <section class="location-section animate-fade-in-up" style="animation-delay: 0.1s" aria-label="Geospatial tagging">
          <button 
            type="button"
            class="location-toggle glass-card" 
            (click)="toggleMap()"
            [class.active]="showMap"
          >
            <div class="toggle-left">
              <span class="toggle-icon-wrap bg-blue-tint">
                <i class="ti ti-map-pin" aria-hidden="true"></i>
              </span>
              <div class="toggle-info">
                <span class="toggle-label">Add Location Coordinates</span>
                <span class="toggle-hint">{{ pinLat ? 'Location geotagged successfully' : 'Optional geospatial coordinates' }}</span>
              </div>
            </div>
            <div class="toggle-chevron" [class.open]="showMap">
              <i class="ti ti-chevron-down" aria-hidden="true"></i>
            </div>
          </button>

          <!-- Collapsible map tray wrapper -->
          <div class="map-wrapper" [class.expanded]="showMap">
            <div class="map-container glass-card">
              <div #mapContainer id="detect-map" class="leaflet-map"></div>
              
              <div *ngIf="pinLat && pinLng" class="coords-display animate-fade-in">
                <span class="coords-text">
                  Geotag: <strong style="color: var(--primary);">{{ pinLat.toFixed(6) }}</strong>, <strong style="color: var(--primary);">{{ pinLng.toFixed(6) }}</strong>
                </span>
                <button class="coords-clear" (click)="clearPin()" title="Remove coordinates" aria-label="Clear pin">✕</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Analyze trigger action -->
        <div class="action-area" *ngIf="selectedFile">
          <button 
            class="btn-primary btn-detect animate-fade-in-up" 
            [disabled]="isProcessing" 
            (click)="startDetection()"
          >
            <span *ngIf="!isProcessing" class="btn-inner-row">
              <i class="ti ti-analyze" aria-hidden="true"></i> Analyze Image
            </span>
            <span *ngIf="isProcessing" class="processing">
              <span class="spinner-inline" aria-hidden="true"></span>
              Running YOLOv8 inference...
            </span>
          </button>
        </div>

        <!-- Error banner -->
        <div class="error-message animate-scale-in" *ngIf="error">
          <i class="ti ti-alert-circle" aria-hidden="true"></i>
          <span>{{ error }}</span>
        </div>
      </div>
    </div>
  `,
    styles: [`
      .text-center {
        text-align: center;
      }

      .upload-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      /* Upload area */
      .upload-area {
        position: relative;
        border: 1.5px dashed rgba(0, 0, 0, 0.15) !important;
        border-radius: var(--radius-lg);
        padding: 48px 24px;
        text-align: center;
        cursor: pointer;
        transition: var(--transition);
        min-height: 320px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .upload-area:hover, .upload-area.dragover {
        border-color: var(--primary) !important;
        background: rgba(255, 255, 255, 0.9);
      }

      .upload-icon-box {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        margin-bottom: 16px;
      }

      .bg-blue-tint {
        background: rgba(0, 122, 255, 0.08);
        color: var(--primary);
      }

      .upload-placeholder h3 {
        font-family: 'Outfit', sans-serif;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-primary);
      }

      .upload-placeholder p {
        color: var(--text-secondary);
        font-size: 13px;
        margin-bottom: 12px;
      }

      .upload-note {
        display: inline-block;
        font-size: 10.5px;
        color: var(--text-secondary);
        background: rgba(0, 0, 0, 0.04);
        padding: 4px 10px;
        border-radius: 20px;
        font-weight: 500;
      }

      .sample-btn-box {
        margin-top: 20px;
      }

      .image-preview-container {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #eef2f5;
      }

      .preview-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .preview-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .image-preview-container:hover .preview-overlay {
        opacity: 1;
      }

      .btn-change-img {
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        border: none !important;
        background: #fff !important;
      }

      /* Collapsible geotagging */
      .location-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        cursor: pointer;
        border: var(--glass-border);
        background: var(--card-surface);
        color: var(--text-primary);
      }

      .location-toggle.active {
        border-color: var(--primary);
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }

      .toggle-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .toggle-icon-wrap {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }

      .toggle-info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      .toggle-label {
        font-weight: 600;
        font-size: 13.5px;
      }

      .toggle-hint {
        font-size: 11px;
        color: var(--text-secondary);
        margin-top: 1px;
      }

      .toggle-chevron {
        transition: transform 0.2s ease;
        color: var(--text-secondary);
        font-size: 16px;
      }

      .toggle-chevron.open {
        transform: rotate(180deg);
      }

      .map-wrapper {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .map-wrapper.expanded {
        max-height: 420px;
      }

      .map-container {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        overflow: hidden;
        border-top: none;
      }

      .leaflet-map {
        height: 300px;
        width: 100%;
        z-index: 1;
      }

      .coords-display {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.02);
        border-top: 0.5px solid var(--border-tint);
      }

      .coords-text {
        font-size: 12.5px;
        font-weight: 500;
        color: var(--text-secondary);
      }

      .coords-clear {
        background: rgba(255, 69, 58, 0.08);
        border: 0.5px solid rgba(255, 69, 58, 0.2);
        color: #d70015;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 10px;
        font-weight: bold;
        transition: var(--transition);
      }

      .coords-clear:hover {
        background: rgba(255, 69, 58, 0.15);
        transform: scale(1.1);
      }

      /* Trigger area */
      .action-area {
        margin-top: 10px;
        display: flex;
        justify-content: center;
      }

      .btn-detect {
        width: 100%;
        justify-content: center;
        padding: 12px 24px;
        font-size: 15px;
        border-radius: 20px;
      }

      .btn-inner-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .processing {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .spinner-inline {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        display: inline-block;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .error-message {
        margin-top: 10px;
        padding: 12px 16px;
        background: rgba(255, 69, 58, 0.06);
        border: 0.5px solid rgba(255, 69, 58, 0.2);
        border-radius: 12px;
        color: #d70015;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        font-size: 13px;
      }
      .error-message i {
        font-size: 16px;
        flex-shrink: 0;
      }
    `]
})
export class DetectComponent implements AfterViewInit, OnDestroy {
    @ViewChild('mapContainer') mapContainer!: ElementRef;

    isDragover = false;
    selectedFile: File | null = null;
    previewUrl: string | null = null;
    isProcessing = false;
    error: string | null = null;

    showMap = false;
    private map: L.Map | null = null;
    private marker: L.Marker | null = null;
    pinLat: number | null = null;
    pinLng: number | null = null;

    private pinIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 56" width="34" height="48">
                <path d="M20 0 C8.95 0 0 8.95 0 20 C0 35 20 56 20 56 S40 35 40 20 C40 8.95 31.05 0 20 0Z" fill="#007AFF" stroke="#ffffff" stroke-width="2"/>
                <circle cx="20" cy="19" r="6" fill="white" />
            </svg>
        `),
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -42]
    });

    constructor(private apiService: ApiService, private router: Router) { }

    ngAfterViewInit() { }

    ngOnDestroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }

    toggleMap() {
        this.showMap = !this.showMap;
        if (this.showMap && !this.map) {
            setTimeout(() => this.initMap(), 50);
        } else if (this.showMap && this.map) {
            setTimeout(() => this.map?.invalidateSize(), 50);
        }
    }

    private initMap() {
        if (!this.mapContainer?.nativeElement) return;

        this.map = L.map(this.mapContainer.nativeElement, {
            center: [22.3072, 73.1812], // Vadodara Smart City Center
            zoom: 13,
            zoomControl: true,
            attributionControl: true
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        this.map.on('click', (e: L.LeafletMouseEvent) => {
            this.setPin(e.latlng.lat, e.latlng.lng);
        });

        setTimeout(() => this.map?.invalidateSize(), 300);
    }

    private setPin(lat: number, lng: number) {
        this.pinLat = lat;
        this.pinLng = lng;

        if (this.marker && this.map) {
            this.marker.setLatLng([lat, lng]);
        } else if (this.map) {
            this.marker = L.marker([lat, lng], { icon: this.pinIcon }).addTo(this.map);
        }
    }

    clearPin() {
        if (this.marker && this.map) {
            this.map.removeLayer(this.marker);
            this.marker = null;
        }
        this.pinLat = null;
        this.pinLng = null;
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragover = true;
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragover = false;
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragover = false;

        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            this.handleFile(event.dataTransfer.files[0]);
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.handleFile(input.files[0]);
        }
    }

    handleFile(file: File) {
        this.error = null;

        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            this.error = 'Invalid file type. Please upload a JPG, PNG, or WebP image.';
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            this.error = 'File is too large. Maximum size is 50MB.';
            return;
        }

        this.selectedFile = file;

        const reader = new FileReader();
        reader.onload = () => {
            this.previewUrl = reader.result as string;
        };
        reader.readAsDataURL(file);
    }

    clearSelection(event: Event) {
        event.stopPropagation();
        this.selectedFile = null;
        this.previewUrl = null;
        this.error = null;
    }

    startDetection() {
        if (!this.selectedFile) return;

        this.isProcessing = true;
        this.error = null;

        const lat = this.pinLat ?? undefined;
        const lng = this.pinLng ?? undefined;

        this.apiService.detectPotholes(this.selectedFile, lat, lng).subscribe({
            next: (res) => {
                this.isProcessing = false;
                if (res.success && res.detection?.id) {
                    this.router.navigate(['/results', res.detection.id]);
                }
            },
            error: (err) => {
                this.isProcessing = false;
                this.error = err.error?.error || 'Failed to connect to inference service. Make sure the Flask backend is running.';
                console.error('Detection error:', err);
            }
        });
    }

    loadSampleImage(event: Event) {
        event.stopPropagation();
        this.error = null;
        this.isProcessing = true;

        fetch('assets/pothole_sample.jpg')
            .then(res => {
                if (!res.ok) throw new Error('Failed to load sample image');
                return res.blob();
            })
            .then(blob => {
                const file = new File([blob], 'pothole_sample.jpg', { type: 'image/jpeg' });
                this.selectedFile = file;
                this.previewUrl = 'assets/pothole_sample.jpg';
                this.isProcessing = false;
            })
            .catch(err => {
                this.isProcessing = false;
                this.error = 'Failed to load sample image. Please try uploading manually.';
                console.error(err);
            });
    }
}
