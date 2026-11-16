import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_STORAGE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || 'apmams-files').trim() || 'apmams-files';

let cachedSupabaseClient: SupabaseClient | null = null;
let cachedConfigSignature = '';
let loggedFallbackNotice = false;

function getSupabaseCredentials(): { url: string; serviceKey: string } {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  ).trim();
  return { url, serviceKey };
}

/**
 * Returns true when backend Supabase Storage credentials (URL + service role / secret key)
 * are configured in the environment.
 */
export function isSupabaseStorageConfigured(): boolean {
  const { url, serviceKey } = getSupabaseCredentials();
  return Boolean(url && serviceKey);
}

function getSupabaseAdminClient(): SupabaseClient | null {
  const { url, serviceKey } = getSupabaseCredentials();
  if (!url || !serviceKey) return null;

  const sig = `${url}|${serviceKey.slice(0, 12)}`;
  if (!cachedSupabaseClient || cachedConfigSignature !== sig) {
    cachedSupabaseClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    cachedConfigSignature = sig;
  }
  return cachedSupabaseClient;
}

export interface StorageUploadResult {
  provider: 'supabase' | 'postgres';
  bucket: string;
  storagePath: string;
}

/**
 * Uploads binary file content to Supabase Storage when configured, or returns
 * 'postgres' so the caller can persist the bytes inside apmams.stored_files.
 */
export async function uploadFileToStorageBackend(params: {
  buffer: Buffer;
  storagePath: string;
  mimeType: string;
  bucket?: string;
}): Promise<StorageUploadResult> {
  const bucket = params.bucket || DEFAULT_STORAGE_BUCKET;
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    if (!loggedFallbackNotice) {
      loggedFallbackNotice = true;
      console.warn(
        '[StorageService] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured; using PostgreSQL fallback storage until configured.'
      );
    }
    return {
      provider: 'postgres',
      bucket,
      storagePath: params.storagePath
    };
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(params.storagePath, params.buffer, {
      contentType: params.mimeType,
      upsert: false
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  return {
    provider: 'supabase',
    bucket,
    storagePath: params.storagePath
  };
}

/**
 * Downloads binary file bytes from Supabase Storage.
 */
export async function downloadFileFromSupabaseStorage(
  bucket: string,
  storagePath: string
): Promise<Buffer> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error(
      'Supabase Storage credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are not configured on this server.'
    );
  }

  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error || !data) {
    throw new Error(`Failed to retrieve file from Supabase Storage: ${error?.message || 'Object not found'}`);
  }

  const arrayBuf = await data.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/**
 * Deletes an object from Supabase Storage. Swallows missing-object cleanup issues cleanly.
 */
export async function deleteFileFromSupabaseStorage(
  bucket: string,
  storagePath: string
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) {
    console.warn('[StorageService] Supabase Storage remove warning:', error.message);
  }
}
