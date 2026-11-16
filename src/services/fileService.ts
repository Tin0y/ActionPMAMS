import { StoredFileRef } from '../types';

export type FileUploadScope = 'organization' | 'dad' | 'accomplishment' | 'avatar';

export interface UploadedStoredFile extends StoredFileRef {
  id: string;
  fileId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: string;
  sizeBytes: number;
  type: string;
  uploadDate: string;
  storageBucket?: string;
  storagePath?: string;
  storageProvider: 'supabase' | 'postgres' | 'local';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read file payload.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function inferTypeLabel(fileName: string): string {
  const ext = fileName.split('.').pop()?.toUpperCase() || '';
  if (ext === 'XLSX' || ext === 'XLS' || ext === 'CSV') return 'XLSX';
  if (ext === 'DOCX' || ext === 'DOC') return 'DOCX';
  if (ext === 'PNG' || ext === 'JPG' || ext === 'JPEG' || ext === 'WEBP' || ext === 'GIF') return ext;
  return ext || 'PDF';
}

/**
 * Upload a file directly to the backend /api/files/upload endpoint (Supabase Storage
 * or PostgreSQL fallback). Falls back to a local Data URL only when running in
 * static offline mode without a backend server.
 */
export async function uploadStoredFile(
  file: File,
  options: {
    scope: FileUploadScope;
    orgId?: string;
    activityId?: string;
  }
): Promise<UploadedStoredFile> {
  const params = new URLSearchParams({
    scope: options.scope,
    fileName: file.name
  });
  if (options.orgId) params.set('orgId', options.orgId);
  if (options.activityId) params.set('activityId', options.activityId);

  try {
    const res = await fetch(`/api/files/upload?${params.toString()}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });

    if (res.ok) {
      const json = await res.json();
      const d = json?.data || {};
      return {
        id: d.fileId || d.id || `file_${Date.now()}`,
        fileId: d.fileId || d.id,
        name: d.fileName || file.name,
        fileName: d.fileName || file.name,
        fileUrl: d.fileUrl,
        mimeType: d.mimeType || file.type || 'application/octet-stream',
        fileSize: d.fileSize || formatSize(file.size),
        sizeBytes: Number(d.sizeBytes ?? file.size),
        type: d.type || inferTypeLabel(file.name),
        uploadDate: d.uploadDate || new Date().toISOString().split('T')[0],
        storageBucket: d.storageBucket,
        storagePath: d.storagePath,
        storageProvider: d.storageProvider || 'supabase'
      };
    }

    // Only fall back to local Data URL when backend file endpoint does not exist (static hosting)
    if (res.status !== 404 && res.status !== 502 && res.status !== 503) {
      let msg = `File upload failed (${res.status})`;
      try {
        const errJson = await res.json();
        msg = errJson?.message || errJson?.error || msg;
      } catch {
        // ignore JSON parse error
      }
      throw new Error(msg);
    }
  } catch (err: any) {
    if (!(err instanceof TypeError)) {
      throw err;
    }
  }

  // Offline / static preview fallback (< 2 MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Backend server is unreachable; files larger than 2 MB require the connected server.');
  }
  const dataUrl = await readFileAsDataUrl(file);
  const localId = `local_${Date.now().toString(36)}`;
  return {
    id: localId,
    fileId: localId,
    name: file.name,
    fileName: file.name,
    fileUrl: dataUrl,
    mimeType: file.type || 'application/octet-stream',
    fileSize: formatSize(file.size),
    sizeBytes: file.size,
    type: inferTypeLabel(file.name),
    uploadDate: new Date().toISOString().split('T')[0],
    storageProvider: 'local'
  };
}

/**
 * Deletes a previously uploaded file from backend/Supabase Storage when removed before saving or deleted.
 */
export async function deleteStoredFile(fileId?: string | null): Promise<void> {
  if (!fileId || fileId.startsWith('local_') || fileId.startsWith('att')) return;
  try {
    await fetch(`/api/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
  } catch {
    // Non-fatal cleanup warning
  }
}

export function getAttachmentName(item: string | StoredFileRef | null | undefined): string {
  if (!item) return '';
  return typeof item === 'string' ? item : item.name || 'Attachment';
}

export function getAttachmentUrl(
  item: string | StoredFileRef | null | undefined,
  explicitUrl?: string
): string {
  if (explicitUrl) return explicitUrl;
  if (!item || typeof item === 'string') return '';
  return item.fileUrl || (item.fileId ? `/api/files/${item.fileId}` : '');
}

export function getAttachmentFileId(item: string | StoredFileRef | null | undefined): string | undefined {
  if (!item || typeof item === 'string') return undefined;
  return item.fileId || item.id;
}

export function buildFileActionUrl(url: string, download = false): string {
  if (!url) return '';
  if (!url.startsWith('/api/files/')) return url;
  if (!download) return url;
  return url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
}

export function isImageAttachment(nameOrUrl?: string, mimeType?: string): boolean {
  if (mimeType && mimeType.toLowerCase().startsWith('image/')) return true;
  if (!nameOrUrl) return false;
  if (nameOrUrl.startsWith('data:image/')) return true;
  return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(nameOrUrl);
}
