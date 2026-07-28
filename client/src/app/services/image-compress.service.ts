import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImageCompressService {

  compressImageFile(file: File, maxWidth = 800, quality = 0.7): Observable<File> {
    return from(new Promise<File>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Blob generation failed'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            console.log(`[Image Compressor] Original size: ${(file.size / 1024).toFixed(1)} KB | Compressed size: ${(compressedFile.size / 1024).toFixed(1)} KB`);
            resolve(compressedFile);
          }, 'image/jpeg', quality);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    }));
  }

  compressDataUrl(dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Calculate raw size approximations
        const origSize = Math.round((dataUrl.length * 3) / 4);
        const compSize = Math.round((compressedDataUrl.length * 3) / 4);
        console.log(`[Image Compressor] DataURL Original: ${(origSize / 1024).toFixed(1)} KB | Compressed: ${(compSize / 1024).toFixed(1)} KB`);

        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    });
  }
}
