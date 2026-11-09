import 'dotenv/config';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  schema: string;
  psqlPath?: string;
}

/**
 * Validates that all required database credentials and configuration parameters
 * are present in the environment without exposing their values in logs or exceptions.
 */
export function assertValidDatabaseConfig(): void {
  const password = process.env.PGPASSWORD;
  if (!password || !password.trim()) {
    throw new Error(
      '[PostgreSQL Configuration Error] Database password is required. The PGPASSWORD environment variable is missing. ' +
      'Please configure PGPASSWORD in your environment or secure .env file. Hardcoded database credentials are not permitted.'
    );
  }
}

export const dbConfig: DbConfig = {
  get host() {
    return process.env.PGHOST || 'localhost';
  },
  get port() {
    return parseInt(process.env.PGPORT || '5432', 10);
  },
  get database() {
    return process.env.PGDATABASE || 'APMaMS';
  },
  get user() {
    return process.env.PGUSER || 'postgres';
  },
  get password() {
    const pw = process.env.PGPASSWORD;
    if (!pw || !pw.trim()) {
      throw new Error(
        '[PostgreSQL Configuration Error] Database password is required. The PGPASSWORD environment variable is missing. ' +
        'Please configure PGPASSWORD in your environment or secure .env file. Hardcoded database credentials are not permitted.'
      );
    }
    return pw;
  },
  get schema() {
    return process.env.PGSCHEMA || 'apmams';
  },
  get psqlPath() {
    return process.env.PSQL_PATH || 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
  }
};

/**
 * Execute raw SQL commands directly against PostgreSQL via psql with stdin.
 * Guarantees zero npm dependency issues, native Windows PostgreSQL 18 support,
 * and immediate visibility in pgAdmin 4.
 */
export function executeRawSql(sql: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Ensure session uses the APMAMS schema first
    const script = `SET search_path = ${dbConfig.schema}, public;\n${sql}\n`;

    // For large scripts (e.g. base64 image data URLs or large batches), write to a temp file and execute with psql -f
    // to prevent Windows named pipe buffer deadlocks.
    if (script.length > 8192) {
      const tempFile = path.join(os.tmpdir(), `apmams_${Date.now()}_${Math.random().toString(36).substring(2)}.sql`);
      try {
        fs.writeFileSync(tempFile, script, 'utf8');
      } catch (err) {
        return reject(err);
      }

      const args = [
        '-U', dbConfig.user,
        '-h', dbConfig.host,
        '-p', dbConfig.port.toString(),
        '-d', dbConfig.database,
        '-t',
        '-A',
        '-q',
        '-v', 'ON_ERROR_STOP=1',
        '-f', tempFile
      ];

      const child = spawn(dbConfig.psqlPath || 'psql', args, {
        env: {
          ...process.env,
          PGPASSWORD: dbConfig.password
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', chunk => { stdout += chunk.toString(); });
      child.stderr.on('data', chunk => { stderr += chunk.toString(); });

      child.on('close', code => {
        try { fs.unlinkSync(tempFile); } catch {}
        if (code !== 0) {
          return reject(new Error(`[PostgreSQL] Execution failed (code ${code}): ${stderr || stdout}`));
        }
        resolve(stdout.trim());
      });

      child.on('error', err => {
        try { fs.unlinkSync(tempFile); } catch {}
        reject(err);
      });
      return;
    }

    const args = [
      '-U', dbConfig.user,
      '-h', dbConfig.host,
      '-p', dbConfig.port.toString(),
      '-d', dbConfig.database,
      '-t',
      '-A',
      '-q',
      '-v', 'ON_ERROR_STOP=1'
    ];

    const child = spawn(dbConfig.psqlPath || 'psql', args, {
      env: {
        ...process.env,
        PGPASSWORD: dbConfig.password
      }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });

    child.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`[PostgreSQL] Execution failed (code ${code}): ${stderr || stdout}`));
      }
      resolve(stdout.trim());
    });

    child.on('error', err => reject(err));

    child.stdin.write(script);
    child.stdin.end();
  });
}

/**
 * Executes a SELECT query and parses the result as JSON array
 */
export async function query<T = any>(sql: string): Promise<T[]> {
  const cleanSql = sql.trim().replace(/;+\s*$/, '');
  const wrapped = `SELECT coalesce(json_agg(t), '[]'::json) FROM (${cleanSql}) t;`;
  const raw = await executeRawSql(wrapped);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch (err) {
    console.warn('[PostgreSQL] JSON parse error on query:', raw, err);
    return [];
  }
}

/**
 * Executes a query returning a single row as object
 */
export async function queryRow<T = any>(sql: string): Promise<T | null> {
  const rows = await query<T>(sql);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Encodes a string as hex-decoded UTF-8 text in PostgreSQL.
 * Guarantees complete immunity against SQL injection and psql stdin meta-commands (\!, \q, etc.)
 * while preserving exact characters (including bcrypt $2a$/$2b$ hashes, quotes, backslashes, Unicode).
 */
export function sqlText(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  const cleaned = String(val).replace(/\0/g, '');
  const hex = Buffer.from(cleaned, 'utf8').toString('hex');
  return `convert_from(decode('${hex}', 'hex'), 'UTF8')`;
}

/**
 * Escape values for SQL literals safely (hardened for psql stdin execution).
 */
export function sqlEscape(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? '0' : val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/\0/g, '');
    if (/[\\\r\n$]/.test(jsonStr)) {
      const hex = Buffer.from(jsonStr, 'utf8').toString('hex');
      return `(convert_from(decode('${hex}', 'hex'), 'UTF8'))::jsonb`;
    }
    return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
  }
  const str = String(val).replace(/\0/g, '');
  if (/[\\\r\n$]/.test(str)) {
    return sqlText(str);
  }
  return `'${str.replace(/'/g, "''")}'`;
}
