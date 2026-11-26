import express, { Router, Response } from 'express';
import crypto from 'crypto';
import { activityRepository } from '../repositories/ActivityRepository';
import { fileRepository } from '../repositories/FileRepository';
import {
  DEFAULT_STORAGE_BUCKET,
  deleteFileFromSupabaseStorage,
  downloadFileFromSupabaseStorage,
  isSupabaseStorageConfigured,
  uploadFileToStorageBackend
} from '../services/StorageService';
import { AuthenticatedRequest, isAdminRole, requireAuth } from '../services/AuthService';
import {
  canModifyOrgActivity,
  canViewOrgPrivateData,
  getActiveSessionRole,
  rejectImpersonationAttempt
} from '../services/AuthorizationService';
import { recordAuditLog } from '../services/AuditService';

export const fileController = Router();

const MAX_SUPABASE_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_POSTGRES_FALLBACK_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt'
]);

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain'
};

type FileScope = 'organization' | 'dad' | 'accomplishment' | 'avatar';

function normalizeScope(raw: unknown): FileScope | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().toLowerCase();
  if (clean === 'organization' || clean === 'dad' || clean === 'accomplishment' || clean === 'avatar') {
    return clean;
  }
  return null;
}

function sanitizeFileName(rawName: unknown): string {
  const str = typeof rawName === 'string' ? rawName : 'document';
  const base = str.replace(/[\\/]/g, '_').replace(/[^\w.\-() ]+/g, '_').trim();
  return (base || 'document').slice(0, 180);
}

function sanitizePathSegment(raw: string | null | undefined, fallback: string): string {
  const clean = (raw || '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return clean || fallback;
}

function formatReadableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function inferShortFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toUpperCase() || '';
  if (ext === 'XLSX' || ext === 'XLS' || ext === 'CSV') return 'XLSX';
  if (ext === 'DOCX' || ext === 'DOC') return 'DOCX';
  if (ext === 'PNG' || ext === 'JPG' || ext === 'JPEG' || ext === 'WEBP' || ext === 'GIF') return ext;
  return ext || 'PDF';
}

/**
 * GET /api/files/status
 * Reports whether external Supabase Storage or PostgreSQL fallback is active.
 */
fileController.get('/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    data: {
      supabaseStorageConfigured: isSupabaseStorageConfigured(),
      provider: isSupabaseStorageConfigured() ? 'supabase' : 'postgres',
      bucket: DEFAULT_STORAGE_BUCKET,
      maxFileBytes: isSupabaseStorageConfigured() ? MAX_SUPABASE_FILE_BYTES : MAX_POSTGRES_FALLBACK_BYTES
    }
  });
});

/**
 * POST /api/files/upload
 * Uploads raw binary file data into Supabase Storage (or PostgreSQL fallback) and saves metadata.
 * Query params: scope, fileName, orgId, activityId
 */
fileController.post(
  '/upload',
  requireAuth,
  express.raw({ type: () => true, limit: '16mb' }),
  async (req: AuthenticatedRequest, res: Response) => {
    if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;

    const caller = req.authUser!;
    const activeRole = getActiveSessionRole(caller);
    const scope = normalizeScope(req.query.scope);
    if (!scope) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        message: 'Valid file scope is required (organization, dad, accomplishment, avatar).'
      });
    }

    const queryOrgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
    const queryActivityId = typeof req.query.activityId === 'string' ? req.query.activityId.trim() : '';

    // Enforce permission scope strictly on the server
    let resolvedOrgId: string | null = queryOrgId || caller.orgId || null;

    if (scope === 'organization') {
      if (!isAdminRole(activeRole)) {
        return res.status(403).json({
          timestamp: new Date().toISOString(),
          status: 403,
          success: false,
          code: 'ADMIN_REQUIRED',
          message: 'Forbidden: Only System Administrators can upload organization accreditation documents.'
        });
      }
      if (!resolvedOrgId) {
        return res.status(400).json({
          timestamp: new Date().toISOString(),
          status: 400,
          success: false,
          message: 'orgId is required when uploading organization attachments.'
        });
      }
    } else if (scope === 'dad' || scope === 'accomplishment') {
      const activity = queryActivityId ? activityRepository.findById(queryActivityId) : undefined;
      resolvedOrgId = activity?.orgId || queryOrgId || caller.orgId || null;

      if (!canModifyOrgActivity(caller, resolvedOrgId)) {
        return res.status(403).json({
          timestamp: new Date().toISOString(),
          status: 403,
          success: false,
          code: 'ORG_UPLOAD_FORBIDDEN',
          message: `Forbidden: You do not have permission to upload ${scope} files for organization "${resolvedOrgId || 'unknown'}".`
        });
      }
    } else if (scope === 'avatar') {
      resolvedOrgId = caller.orgId || null;
    }

    const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (bodyBuffer.length === 0) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        message: 'Uploaded file payload is empty.'
      });
    }

    const maxBytes = isSupabaseStorageConfigured() ? MAX_SUPABASE_FILE_BYTES : MAX_POSTGRES_FALLBACK_BYTES;
    if (bodyBuffer.length > maxBytes) {
      return res.status(413).json({
        timestamp: new Date().toISOString(),
        status: 413,
        success: false,
        message: `File exceeds the maximum allowed upload size of ${Math.round(maxBytes / (1024 * 1024))} MB.`
      });
    }

    const rawFileName = req.query.fileName || req.headers['x-file-name'];
    const fileName = sanitizeFileName(rawFileName);
    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        message: `Unsupported file type ".${ext || 'unknown'}". Allowed: PDF, PNG, JPG, WEBP, GIF, DOC, DOCX, XLS, XLSX, CSV, TXT.`
      });
    }

    if (scope === 'avatar' && !['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        message: 'Avatar uploads must be an image file (PNG, JPG, WEBP, or GIF).'
      });
    }

    const headerMime = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const mimeType =
      headerMime && headerMime !== 'application/octet-stream'
        ? headerMime
        : MIME_BY_EXT[ext] || 'application/octet-stream';

    const fileId = `file_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;
    const folderParts = [
      scope,
      sanitizePathSegment(resolvedOrgId, 'general'),
      sanitizePathSegment(queryActivityId || caller.id, 'item')
    ];
    const storagePath = `${folderParts.join('/')}/${fileId}_${fileName}`;

    try {
      const stored = await uploadFileToStorageBackend({
        buffer: bodyBuffer,
        storagePath,
        mimeType,
        bucket: DEFAULT_STORAGE_BUCKET
      });

      const savedRecord = await fileRepository.insertFileRecord({
        fileId,
        storageBucket: stored.bucket,
        storagePath: stored.storagePath,
        storageProvider: stored.provider,
        fileName,
        mimeType,
        fileSize: bodyBuffer.length,
        scope,
        orgId: resolvedOrgId,
        activityId: queryActivityId || null,
        uploadedBy: caller.id,
        fallbackBuffer: stored.provider === 'postgres' ? bodyBuffer : undefined
      });

      recordAuditLog({
        actor: caller,
        action: 'FILE_UPLOAD',
        entityType: 'stored_file',
        entityId: savedRecord.fileId,
        details: { fileName: savedRecord.fileName, scope, orgId: resolvedOrgId, activityId: queryActivityId || null, provider: savedRecord.storageProvider },
        ipAddress: req.ip
      });

      return res.status(201).json({
        timestamp: new Date().toISOString(),
        status: 201,
        success: true,
        message: `Uploaded "${fileName}" successfully.`,
        data: {
          id: savedRecord.fileId,
          fileId: savedRecord.fileId,
          fileName: savedRecord.fileName,
          fileUrl: `/api/files/${savedRecord.fileId}`,
          mimeType: savedRecord.mimeType,
          fileSize: formatReadableSize(bodyBuffer.length),
          sizeBytes: bodyBuffer.length,
          type: inferShortFileType(savedRecord.fileName),
          uploadDate: new Date().toISOString().split('T')[0],
          storageBucket: savedRecord.storageBucket,
          storagePath: savedRecord.storagePath,
          storageProvider: savedRecord.storageProvider
        }
      });
    } catch (err: any) {
      console.error('[FileController.upload]', err);
      return res.status(500).json({
        timestamp: new Date().toISOString(),
        status: 500,
        success: false,
        message: err?.message || 'Failed to upload file.'
      });
    }
  }
);

/**
 * GET /api/files/:id
 * Streams a stored file inline (for image/PDF preview) or as attachment (?download=1)
 * after enforcing server-side authentication and organization visibility permissions.
 */
fileController.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;

  const fileId = (req.params.id || '').trim();
  if (!/^[a-zA-Z0-9_-]{6,100}$/.test(fileId)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      success: false,
      message: 'Invalid file identifier.'
    });
  }

  try {
    const record = await fileRepository.findById(fileId);
    if (!record) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        success: false,
        message: 'File not found.'
      });
    }

    const caller = req.authUser!;
    if (record.scope !== 'avatar') {
      if (!canViewOrgPrivateData(caller, record.orgId)) {
        return res.status(403).json({
          timestamp: new Date().toISOString(),
          status: 403,
          success: false,
          code: 'FILE_ACCESS_FORBIDDEN',
          message: 'Forbidden: You do not have permission to access files belonging to this organization.'
        });
      }
    }

    let fileBytes: Buffer | null = null;
    if (record.storageProvider === 'supabase') {
      fileBytes = await downloadFileFromSupabaseStorage(record.storageBucket, record.storagePath);
    } else {
      fileBytes = await fileRepository.readPostgresBytes(record.fileId);
    }

    if (!fileBytes) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        success: false,
        message: 'Stored file payload could not be located.'
      });
    }

    const forceDownload = req.query.download === '1' || req.query.download === 'true';
    const disposition = forceDownload ? 'attachment' : 'inline';
    const encodedName = encodeURIComponent(record.fileName);

    let resolvedMime = record.mimeType || 'application/octet-stream';
    if (!resolvedMime || resolvedMime === 'application/octet-stream') {
      const lowerName = (record.fileName || '').toLowerCase();
      if (lowerName.endsWith('.pdf')) resolvedMime = 'application/pdf';
      else if (lowerName.endsWith('.png')) resolvedMime = 'image/png';
      else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) resolvedMime = 'image/jpeg';
      else if (lowerName.endsWith('.webp')) resolvedMime = 'image/webp';
      else if (lowerName.endsWith('.gif')) resolvedMime = 'image/gif';
      else if (lowerName.endsWith('.txt')) resolvedMime = 'text/plain; charset=utf-8';
    }

    res.setHeader('Content-Type', resolvedMime);
    res.setHeader('Content-Length', String(fileBytes.length));
    res.setHeader('Content-Disposition', `${disposition}; filename="${record.fileName.replace(/"/g, '')}"; filename*=UTF-8''${encodedName}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.status(200).send(fileBytes);
  } catch (err: any) {
    console.error('[FileController.get]', err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: err?.message || 'Failed to retrieve file.'
    });
  }
});

/**
 * DELETE /api/files/:id
 * Deletes a stored file from Supabase Storage / PostgreSQL if caller has write permissions.
 */
fileController.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;

  const fileId = (req.params.id || '').trim();
  if (!/^[a-zA-Z0-9_-]{6,100}$/.test(fileId)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      success: false,
      message: 'Invalid file identifier.'
    });
  }

  try {
    const record = await fileRepository.findById(fileId);
    if (!record) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        success: false,
        message: 'File not found.'
      });
    }

    const caller = req.authUser!;
    const activeRole = getActiveSessionRole(caller);
    const allowed =
      record.scope === 'organization'
        ? isAdminRole(activeRole)
        : record.scope === 'avatar'
          ? isAdminRole(activeRole) || record.uploadedBy === caller.id
          : canModifyOrgActivity(caller, record.orgId);

    if (!allowed) {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        code: 'FILE_DELETE_FORBIDDEN',
        message: 'Forbidden: You do not have permission to delete this file.'
      });
    }

    if (record.storageProvider === 'supabase') {
      await deleteFileFromSupabaseStorage(record.storageBucket, record.storagePath);
    }
    await fileRepository.deleteById(record.fileId);
    recordAuditLog({
      actor: caller,
      action: 'FILE_DELETE',
      entityType: 'stored_file',
      entityId: record.fileId,
      details: { fileName: record.fileName, scope: record.scope, orgId: record.orgId },
      ipAddress: req.ip
    });

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: `Deleted "${record.fileName}".`
    });
  } catch (err: any) {
    console.error('[FileController.delete]', err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: err?.message || 'Failed to delete file.'
    });
  }
});
