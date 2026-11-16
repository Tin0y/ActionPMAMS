export interface DocxImagePayload {
  data: Uint8Array;
  width: number;
  height: number;
  type: 'png' | 'jpg' | 'gif' | 'bmp';
}

const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|webp|bmp)(\?|#|$)/i;

/**
 * Checks whether an attachment refers to a renderable image file.
 */
export function isImageAttachment(name?: string, url?: string, mimeType?: string): boolean {
  if (mimeType && mimeType.toLowerCase().startsWith('image/')) return true;
  if (url && /^data:image\//i.test(url.trim())) return true;
  if (name && IMAGE_EXT_REGEX.test(name.trim())) return true;
  if (url && IMAGE_EXT_REGEX.test(url.trim())) return true;
  return false;
}

function inferDocxImageType(mimeType: string, url: string): 'png' | 'jpg' | 'gif' | 'bmp' | null {
  const lowerMime = (mimeType || '').toLowerCase();
  if (lowerMime.includes('png')) return 'png';
  if (lowerMime.includes('jpeg') || lowerMime.includes('jpg')) return 'jpg';
  if (lowerMime.includes('gif')) return 'gif';
  if (lowerMime.includes('bmp')) return 'bmp';

  const cleanUrl = (url || '').split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.png')) return 'png';
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'jpg';
  if (cleanUrl.endsWith('.gif')) return 'gif';
  if (cleanUrl.endsWith('.bmp')) return 'bmp';
  return null;
}

function loadImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width || 400;
      const height = img.naturalHeight || img.height || 300;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image dimensions'));
    };
    img.src = objectUrl;
  });
}

function convertBlobToPng(blob: Blob): Promise<{ pngBlob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width || 400;
      const height = img.naturalHeight || img.height || 300;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((pngBlob) => {
          URL.revokeObjectURL(objectUrl);
          if (!pngBlob) {
            reject(new Error('PNG conversion failed'));
            return;
          }
          resolve({ pngBlob, width, height });
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for PNG conversion'));
    };
    img.src = objectUrl;
  });
}

/**
 * Fetches an image URL (including authenticated /api/files/:id or data:image/... URLs)
 * and returns normalized bytes + aspect-ratio-preserved dimensions for `docx` ImageRun.
 */
export async function fetchImageForDocx(
  url?: string,
  maxWidthPx = 250,
  maxHeightPx = 175
): Promise<DocxImagePayload | null> {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const res = await fetch(trimmed, {
      credentials: trimmed.startsWith('data:') || trimmed.startsWith('blob:') ? 'omit' : 'include'
    });
    if (!res.ok) return null;

    let blob = await res.blob();
    if (!blob || blob.size === 0) return null;

    let type = inferDocxImageType(blob.type, trimmed);
    let naturalWidth = 400;
    let naturalHeight = 300;

    if (!type && typeof document !== 'undefined') {
      const converted = await convertBlobToPng(blob);
      blob = converted.pngBlob;
      naturalWidth = converted.width;
      naturalHeight = converted.height;
      type = 'png';
    } else if (typeof Image !== 'undefined') {
      const dims = await loadImageDimensions(blob);
      naturalWidth = dims.width;
      naturalHeight = dims.height;
    }

    if (!type) return null;

    const scale = Math.min(maxWidthPx / naturalWidth, maxHeightPx / naturalHeight, 1);
    const width = Math.max(40, Math.round(naturalWidth * scale));
    const height = Math.max(40, Math.round(naturalHeight * scale));
    const buffer = await blob.arrayBuffer();

    return {
      data: new Uint8Array(buffer),
      width,
      height,
      type
    };
  } catch {
    return null;
  }
}
