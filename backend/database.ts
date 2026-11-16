import 'dotenv/config';
import pg from 'pg';
import type { Pool as PgPool, PoolConfig, QueryResult } from 'pg';

const { Pool } = pg;

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
  const connectionString = (process.env.DATABASE_URL || '').trim();
  const password = process.env.PGPASSWORD;
  if (!connectionString && (!password || !password.trim())) {
    throw new Error(
      '[PostgreSQL Configuration Error] Database credentials are required (PGPASSWORD or DATABASE_URL is missing). ' +
      'Please configure PostgreSQL environment variables in .env or Vercel Project Settings.'
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
      if ((process.env.DATABASE_URL || '').trim()) {
        return '';
      }
      throw new Error(
        '[PostgreSQL Configuration Error] Database password is required. The PGPASSWORD environment variable is missing.'
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

let sharedPool: PgPool | null = null;
let sharedPoolSig = '';

function shouldUseSsl(hostOrUrl: string): boolean {
  const raw = (hostOrUrl || '').toLowerCase();
  if (process.env.PGSSL === 'false' || process.env.PGSSLMODE === 'disable') {
    return false;
  }
  if (process.env.PGSSL === 'true' || raw.includes('sslmode=require')) {
    return true;
  }
  if (raw.includes('localhost') || raw.includes('127.0.0.1') || raw.includes('::1')) {
    return false;
  }
  return Boolean(
    raw.includes('supabase') ||
    raw.includes('amazonaws') ||
    raw.includes('neon.tech') ||
    raw.includes('render.com') ||
    process.env.VERCEL === '1' ||
    process.env.NODE_ENV === 'production'
  );
}

function getPool(): PgPool {
  assertValidDatabaseConfig();

  const connectionString = (process.env.DATABASE_URL || '').trim();
  const host = dbConfig.host;
  const port = dbConfig.port;
  const database = dbConfig.database;
  const user = dbConfig.user;
  const schema = dbConfig.schema;
  const sig = `${connectionString}|${host}|${port}|${database}|${user}|${schema}`;

  if (sharedPool && sharedPoolSig === sig) {
    return sharedPool;
  }

  const sslEnabled = shouldUseSsl(connectionString || host);
  const maxConnections = parseInt(
    process.env.PGPOOL_MAX || (process.env.VERCEL ? '5' : '10'),
    10
  );

  const poolConfig: PoolConfig = connectionString
    ? {
        connectionString,
        max: maxConnections,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 15000,
        ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {})
      }
    : {
        host,
        port,
        database,
        user,
        password: dbConfig.password,
        max: maxConnections,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 15000,
        ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {})
      };

  const pool = new Pool(poolConfig);
  pool.on('error', (err) => {
    console.warn('[PostgreSQL Pool] Idle client warning:', err.message);
  });

  sharedPool = pool;
  sharedPoolSig = sig;
  return pool;
}

function extractScalarOutput(rawResult: QueryResult | QueryResult[]): string {
  const results = Array.isArray(rawResult) ? rawResult : [rawResult];
  for (let i = results.length - 1; i >= 0; i--) {
    const rows = results[i]?.rows;
    if (rows && rows.length > 0) {
      const firstRow = rows[0];
      const keys = Object.keys(firstRow || {});
      if (keys.length === 1) {
        const val = firstRow[keys[0]];
        if (val === null || val === undefined) return '';
        return typeof val === 'object' ? JSON.stringify(val) : String(val);
      }
      return JSON.stringify(firstRow);
    }
  }
  return '';
}

/**
 * Executes raw SQL (including multi-statement blocks and DO $$ ... END $$)
 * via pure-JS node-postgres (pg) so both local Express and Vercel serverless
 * connect directly to Supabase PostgreSQL without requiring a psql binary.
 */
export async function executeRawSql(sql: string): Promise<string> {
  const safeSchema = dbConfig.schema.replace(/[^a-zA-Z0-9_]/g, '') || 'apmams';
  const trimmed = (sql || '').trim();
  if (!trimmed) return '';

  const script = `SET search_path = ${safeSchema}, public;\n${trimmed}`;
  try {
    const rawResult = await getPool().query(script);
    return extractScalarOutput(rawResult as QueryResult | QueryResult[]);
  } catch (err: any) {
    throw new Error(`[PostgreSQL] Execution failed: ${err?.message || String(err)}`);
  }
}

/**
 * Executes a SELECT query and parses the result as JSON array.
 */
export async function query<T = any>(sql: string): Promise<T[]> {
  const cleanSql = sql.trim().replace(/;+\s*$/, '');
  const wrapped = `SELECT coalesce(json_agg(t), '[]'::json) AS rows_json FROM (${cleanSql}) t;`;
  const safeSchema = dbConfig.schema.replace(/[^a-zA-Z0-9_]/g, '') || 'apmams';
  const script = `SET search_path = ${safeSchema}, public;\n${wrapped}`;

  const rawResult = await getPool().query(script);
  const results = Array.isArray(rawResult) ? rawResult : [rawResult];
  for (let i = results.length - 1; i >= 0; i--) {
    const rows = results[i]?.rows;
    if (rows && rows.length > 0 && 'rows_json' in rows[0]) {
      const parsed = rows[0].rows_json;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    }
  }
  return [];
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
 * Guarantees complete immunity against SQL injection while preserving exact characters
 * (including bcrypt $2a$/$2b$ hashes, quotes, backslashes, Unicode).
 */
export function sqlText(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  const cleaned = String(val).replace(/\0/g, '');
  const hex = Buffer.from(cleaned, 'utf8').toString('hex');
  return `convert_from(decode('${hex}', 'hex'), 'UTF8')`;
}

/**
 * Escape values for SQL literals safely.
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
