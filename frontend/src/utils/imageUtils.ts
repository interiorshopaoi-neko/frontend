/**
 * Client-side image compression utility.
 *
 * - Resizes to maxDim (long edge) using Canvas API
 * - Converts to WebP (JPEG fallback for unsupported browsers)
 * - EXIF data stripped automatically by canvas redraw (pixel-only)
 *
 * Usage:
 *   const blob = await compressImage(file, 800, 0.85);  // avatar
 *   const blob = await compressImage(file, 1600, 0.82); // work photo
 */
export async function compressImage(
  file: File,
  maxDim: number,
  quality = 0.82,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width  = cw;
      canvas.height = ch;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas 2d context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, cw, ch);

      // Try WebP first, fall back to JPEG
      canvas.toBlob(
        blob => {
          if (blob) { resolve(blob); return; }
          canvas.toBlob(
            jpegBlob => jpegBlob
              ? resolve(jpegBlob)
              : reject(new Error('toBlob returned null')),
            'image/jpeg',
            quality,
          );
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('image load failed'));
    };

    img.src = blobUrl;
  });
}
