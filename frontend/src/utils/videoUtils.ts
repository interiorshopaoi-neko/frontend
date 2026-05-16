/**
 * Client-side video thumbnail utility.
 *
 * Seeks to 0.5 s (or first frame if video is shorter) using Canvas API
 * and returns a JPEG Blob at 75% quality.
 *
 * Usage:
 *   const blob = await generateThumbnail(videoFile); // null on failure
 */
export async function generateThumbnail(file: File): Promise<Blob | null> {
  return new Promise(resolve => {
    const blobUrl = URL.createObjectURL(file);
    const video   = document.createElement('video');

    const cleanup = () => {
      URL.revokeObjectURL(blobUrl);
      video.src = '';
    };

    video.muted     = true;
    video.playsInline = true;
    video.preload   = 'metadata';

    video.onloadedmetadata = () => {
      // Seek to 0.5 s, or to 10 % of duration if very short
      video.currentTime = Math.min(0.5, video.duration * 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        cleanup();

        canvas.toBlob(
          blob => resolve(blob),
          'image/jpeg',
          0.75,
        );
      } catch {
        cleanup();
        resolve(null);
      }
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    video.src = blobUrl;
  });
}
