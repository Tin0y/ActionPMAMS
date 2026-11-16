import { executeRawSql, queryRow, sqlEscape, sqlText } from '../database';

export interface StoredFileRecord {
  fileId: string;
  storageBucket: string;
  storagePath: string;
  storageProvider: 'supabase' | 'postgres';
  fileName: string;
  mimeType: string;
  fileSize: number;
  scope: 'organization' | 'dad' | 'accomplishment' | 'avatar';
  orgId: string | null;
  activityId: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

export class FileRepository {
  /**
   * Persist uploaded file metadata (and optional PostgreSQL bytea fallback bytes).
   * For DAD/Accomplishment files on saved activities, also syncs to apmams.activity_files.
   */
  public async insertFileRecord(params: {
    fileId: string;
    storageBucket: string;
    storagePath: string;
    storageProvider: 'supabase' | 'postgres';
    fileName: string;
    mimeType: string;
    fileSize: number;
    scope: 'organization' | 'dad' | 'accomplishment' | 'avatar';
    orgId?: string | null;
    activityId?: string | null;
    uploadedBy?: string | null;
    fallbackBuffer?: Buffer;
  }): Promise<StoredFileRecord> {
    const fileDataExpr =
      params.storageProvider === 'postgres' && params.fallbackBuffer
        ? `decode('${params.fallbackBuffer.toString('hex')}', 'hex')`
        : 'NULL';

    const insertSql = `
      INSERT INTO apmams.stored_files (
        file_id, storage_bucket, storage_path, storage_provider,
        file_name, mime_type, file_size, scope,
        org_id, activity_id, uploaded_by, file_data
      ) VALUES (
        ${sqlEscape(params.fileId)},
        ${sqlEscape(params.storageBucket)},
        ${sqlText(params.storagePath)},
        ${sqlEscape(params.storageProvider)},
        ${sqlText(params.fileName)},
        ${sqlEscape(params.mimeType)},
        ${Math.max(0, Math.floor(params.fileSize))},
        ${sqlEscape(params.scope)},
        ${params.orgId ? sqlEscape(params.orgId) : 'NULL'},
        ${params.activityId ? sqlEscape(params.activityId) : 'NULL'},
        ${params.uploadedBy ? sqlEscape(params.uploadedBy) : 'NULL'},
        ${fileDataExpr}
      );
    `;

    await executeRawSql(insertSql);

    // Sync into normalized apmams.activity_files table if linked to an existing DB activity
    if ((params.scope === 'dad' || params.scope === 'accomplishment') && params.activityId) {
      try {
        const actRow = await queryRow<{ activityId: number; numericUserId: number | null }>(`
          SELECT
            a.activity_id as "activityId",
            (SELECT u.user_id FROM apmams.users u WHERE u.app_user_id = ${sqlEscape(params.uploadedBy || '')} LIMIT 1) as "numericUserId"
          FROM apmams.activities a
          WHERE a.app_activity_id = ${sqlEscape(params.activityId)}
          LIMIT 1;
        `);

        if (actRow?.activityId) {
          await executeRawSql(`
            INSERT INTO apmams.activity_files (
              activity_id, file_name, file_url, file_type, file_size, uploaded_by
            ) VALUES (
              ${actRow.activityId},
              ${sqlText(params.fileName)},
              ${sqlEscape(`/api/files/${params.fileId}`)},
              ${sqlEscape(params.mimeType.slice(0, 50))},
              ${Math.max(0, Math.floor(params.fileSize))},
              ${actRow.numericUserId ?? 'NULL'}
            );
          `);
        }
      } catch (err: any) {
        console.warn('[FileRepository] activity_files sync skipped:', err.message);
      }
    }

    const created = await this.findById(params.fileId);
    if (!created) {
      throw new Error('Failed to verify persisted file record.');
    }
    return created;
  }

  public async findById(fileId: string): Promise<StoredFileRecord | null> {
    return queryRow<StoredFileRecord>(`
      SELECT
        file_id as "fileId",
        storage_bucket as "storageBucket",
        storage_path as "storagePath",
        storage_provider as "storageProvider",
        file_name as "fileName",
        mime_type as "mimeType",
        file_size::bigint as "fileSize",
        scope,
        org_id as "orgId",
        activity_id as "activityId",
        uploaded_by as "uploadedBy",
        created_at as "createdAt"
      FROM apmams.stored_files
      WHERE file_id = ${sqlEscape(fileId)}
      LIMIT 1;
    `);
  }

  public async readPostgresBytes(fileId: string): Promise<Buffer | null> {
    const row = await queryRow<{ hexData: string | null }>(`
      SELECT encode(file_data, 'hex') as "hexData"
      FROM apmams.stored_files
      WHERE file_id = ${sqlEscape(fileId)}
      LIMIT 1;
    `);
    if (!row?.hexData) return null;
    return Buffer.from(row.hexData, 'hex');
  }

  public async deleteById(fileId: string): Promise<void> {
    await executeRawSql(`
      DELETE FROM apmams.activity_files WHERE file_url = ${sqlEscape(`/api/files/${fileId}`)};
      DELETE FROM apmams.stored_files WHERE file_id = ${sqlEscape(fileId)};
    `);
  }
}

export const fileRepository = new FileRepository();
