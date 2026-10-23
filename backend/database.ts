import { spawn } from 'child_process';
import path from 'path';

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  schema: string;
  psqlPath?: string;
}

export const dbConfig: DbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'APMaMS',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '1234',
  schema: process.env.PGSCHEMA || 'apmams',
  psqlPath: process.env.PSQL_PATH || 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe'
};

/**
 * Execute raw SQL commands directly against PostgreSQL via psql with stdin.
 * Guarantees zero npm dependency issues, native Windows PostgreSQL 18 support,
 * and immediate visibility in pgAdmin 4.
 */
export function executeRawSql(sql: string): Promise<string> {
  return new Promise((resolve, reject) => {
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

    // Ensure session uses the APMAMS schema first
    const script = `SET search_path = ${dbConfig.schema}, public;\n${sql}\n`;
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
 * Escape single quotes for SQL string literals safely
 */
export function sqlEscape(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? '0' : val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}
