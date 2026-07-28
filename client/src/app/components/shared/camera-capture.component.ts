import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageCompressService } from '../../services/image-compress.service';

@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="camera-capture-container">
      <!-- Image Preview Section -->
      <div class="image-preview-container glass-card" *ngIf="previewUrl && !webcamActive">
        <img [src]="previewUrl" alt="Pothole preview" class="preview-img" />
        <button class="remove-btn" (click)="clearSelection()" type="button" aria-label="Remove image">
          <i class="ti ti-x"></i>
        </button>
      </div>

      <!-- Desktop Webcam Stream -->
      <div class="webcam-viewport glass-card" *ngIf="webcamActive">
        <video #videoElement autoplay playsinline class="webcam-video"></video>
        <div class="webcam-controls">
          <button class="btn-primary" (click)="captureWebcam()" type="button">
            <i class="ti ti-camera"></i> Snap Photo
          </button>
          <button class="btn-secondary" (click)="stopWebcam()" type="button">
            Cancel
          </button>
        </div>
      </div>

      <!-- Trigger Buttons -->
      <div class="capture-actions" *ngIf="!previewUrl && !webcamActive">
        <!-- Desktop Webcam Trigger -->
        <button class="btn-secondary flex-1" *ngIf="!isMobile" (click)="startWebcam()" type="button">
          <i class="ti ti-camera"></i> Use Webcam
        </button>

        <!-- Mobile Native Camera Trigger -->
        <button class="btn-primary flex-1 relative-btn" *ngIf="isMobile" type="button">
          <i class="ti ti-camera"></i> Take Photo
          <input type="file" accept="image/*" capture="environment" class="hidden-file-input" (change)="onFileSelected($event)">
        </button>

        <!-- File Pick Trigger -->
        <button class="btn-secondary flex-1 relative-btn" type="button">
          <i class="ti ti-photo-up"></i> Choose File
          <input type="file" accept="image/*" class="hidden-file-input" (change)="onFileSelected($event)">
        </button>
      </div>
      
      <p class="meta text-center" style="margin-top: 8px;" *ngIf="compressing">Compressing image...</p>
    </div>
  `,
  styles: [`
    .camera-capture-container {
      width: 100%;
    }
    .image-preview-container {
      position: relative;
      width: 100%;
      height: 200px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      border-radius: 16px;
    }
    .preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .remove-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      border: none;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: var(--transition);
    }
    .remove-btn:hover {
      background: rgba(0, 0, 0, 0.7);
      transform: scale(1.05);
    }
    .webcam-viewport {
      position: relative;
      width: 100%;
      height: 240px;
      background: #000;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .webcam-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .webcam-controls {
      position: absolute;
      bottom: 12px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      gap: 12px;
      z-index: 10;
    }
    .capture-actions {
      display: flex;
      gap: 12px;
      width: 100%;
    }
    .flex-1 {
      flex: 1;
    }
    .relative-btn {
      position: relative;
      overflow: hidden;
    }
    .hidden-file-input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }
  `]
})
export class CameraCaptureComponent implements OnDestroy {
  private compressService = inject(ImageCompressService);
  @Output() imageSelected = new EventEmitter<{ file: File; previewUrl: string }>();
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  previewUrl: string | null = null;
  webcamActive = false;
  isMobile = false;
  compressing = false;
  private mediaStream: MediaStream | null = null;

  constructor() {
    // Check if mobile device
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    this.isMobile = /android|iphone|ipad|ipod|windows phone/i.test(userAgent);
  }

  ngOnDestroy() {
    this.stopWebcam();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.processImage(file);
    }
  }

  startWebcam(): void {
    this.webcamActive = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        this.mediaStream = stream;
        if (this.videoElement) {
          this.videoElement.nativeElement.srcObject = stream;
        }
      })
      .catch(err => {
        console.error('Webcam initialization failed:', err);
        alert('Webcam could not be started. Please upload a file instead.');
        this.webcamActive = false;
      });
  }

  stopWebcam(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.webcamActive = false;
  }

  captureWebcam(): void {
    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.processImage(file);
      }
      this.stopWebcam();
    }, 'image/jpeg', 0.85);
  }

  clearSelection(): void {
    this.previewUrl = null;
    this.imageSelected.emit({ file: null as any, previewUrl: '' });
  }

  private processImage(file: File): void {
    this.compressing = true;
    this.compressService.compressImageFile(file, 800, 0.7).subscribe({
      next: compressedFile => {
        this.compressing = false;
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onload = () => {
          this.previewUrl = reader.result as string;
          this.imageSelected.emit({
            file: compressedFile,
            previewUrl: this.previewUrl
          });
        };
      },
      error: err => {
        console.error('Image compression error:', err);
        this.compressing = false;
        // Fallback to original
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          this.previewUrl = reader.result as string;
          this.imageSelected.emit({ file, previewUrl: this.previewUrl });
        };
      }
    });
  }
}
