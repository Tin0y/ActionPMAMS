import readline from 'readline';
import { executeRawSql, query, queryRow, sqlText } from '../database';
import {
  authService,
  hashPassword,
  isValidBcryptHash,
  validatePasswordPolicy
} from '../services/AuthService';

interface AuditRow {
  user_id: number;
  app_user_id: string | null;
  email: string;
  username: string | null;
  role_code: string | null;
  is_active: boolean | null;
  password_hash: string | null;
  must_change_password: boolean | null;
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--audit') args.audit = true;
    else if (token === '--stdin') args.stdin = true;
    else if (token === '--no-force-change') args.noForceChange = true;
    else if (token === '--user' && argv[i + 1]) {
      args.user = argv[++i];
    }
  }
  return args;
}

async function readSecretFromStdin(promptLabel?: string): Promise<string> {
  if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
    if (promptLabel) {
      process.stdout.write(promptLabel);
    }
    return new Promise(resolve => {
      let secret = '';
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (chunk: string) => {
        for (const ch of chunk) {
          if (ch === '\r' || ch === '\n') {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            resolve(secret);
            return;
          }
          if (ch === '\u0003') {
            // Ctrl+C
            process.stdin.setRawMode(false);
            process.stdout.write('\nCancelled.\n');
            process.exit(130);
          }
          if (ch === '\u0008' || ch === '\u007f') {
            // Backspace / Delete
            secret = secret.slice(0, -1);
          } else if (ch >= ' ') {
            secret += ch;
          }
        }
      };

      process.stdin.on('data', onData);
    });
  }

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: undefined,
      terminal: false
    });
    let captured = '';
    rl.once('line', line => {
      captured = line.replace(/\r?\n$/, '');
      rl.close();
      resolve(captured);
    });
    rl.once('error', err => {
      rl.close();
      reject(err);
    });
  });
}

async function ensureAuthColumnsExist(): Promise<void> {
  await executeRawSql(`
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS password_hash text;
    ALTER TABLE apmams.users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS password_updated_at timestamptz;
    CREATE TABLE IF NOT EXISTS apmams.user_sessions (
      session_id varchar(128) PRIMARY KEY,
      app_user_id varchar(50) NOT NULL,
      active_role varchar(50) NOT NULL,
      ip_address varchar(100),
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz
    );
  `);
}

async function runAudit(): Promise<void> {
  await ensureAuthColumnsExist();
  const rows = await query<AuditRow>(`
    SELECT
      user_id,
      app_user_id,
      email,
      username,
      role_code,
      is_active,
      password_hash,
      must_change_password
    FROM apmams.users
    ORDER BY user_id ASC
  `);

  let validBcryptCount = 0;
  let missingOrInvalidHashCount = 0;
  let activeCount = 0;
  let deactivatedCount = 0;
  let mustChangeCount = 0;
  const accountsNeedingReset: Array<{ id: string; email: string; role: string; reason: string }> = [];

  for (const r of rows) {
    if (r.is_active !== false) activeCount++;
    else deactivatedCount++;

    if (r.must_change_password) mustChangeCount++;

    if (isValidBcryptHash(r.password_hash)) {
      validBcryptCount++;
    } else {
      missingOrInvalidHashCount++;
      accountsNeedingReset.push({
        id: r.app_user_id || `usr-${r.user_id}`,
        email: r.email,
        role: r.role_code || 'UNKNOWN',
        reason: !r.password_hash ? 'MISSING_PASSWORD_HASH' : 'INVALID_HASH_FORMAT'
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        summary: {
          totalAccounts: rows.length,
          activeAccounts: activeCount,
          deactivatedAccounts: deactivatedCount,
          validBcryptHashes: validBcryptCount,
          missingOrInvalidHashes: missingOrInvalidHashCount,
          flaggedMustChangePassword: mustChangeCount
        },
        accountsRequiringAdminReset: accountsNeedingReset
      },
      null,
      2
    )
  );
}

async function runPasswordReset(targetIdentifier: string, forceChange: boolean): Promise<void> {
  await ensureAuthColumnsExist();
  const idLower = targetIdentifier.trim().toLowerCase();
  const idSql = sqlText(idLower);

  const user = await queryRow<{
    user_id: number;
    app_user_id: string | null;
    email: string;
    is_active: boolean | null;
  }>(`
    SELECT user_id, app_user_id, email, is_active
    FROM apmams.users
    WHERE LOWER(email) = ${idSql}
       OR LOWER(COALESCE(username, '')) = ${idSql}
       OR LOWER(COALESCE(app_user_id, '')) = ${idSql}
       OR (COALESCE(username, '') = '' AND LOWER(SPLIT_PART(email, '@', 1)) = ${idSql})
    LIMIT 1
  `);

  if (!user) {
    console.error(`[AuthReset] Error: No existing user found matching "${targetIdentifier}".`);
    process.exit(1);
  }

  const newPlainPassword = await readSecretFromStdin(
    `Enter new password (min 8 chars, typing hidden) for ${user.email}: `
  );

  const check = validatePasswordPolicy(newPlainPassword);
  if (!check.valid) {
    console.error(`[AuthReset] Validation failed: ${check.message}`);
    process.exit(1);
  }

  const bcryptHash = await hashPassword(newPlainPassword);
  const appId = user.app_user_id || `usr-${user.user_id}`;

  await executeRawSql(`
    UPDATE apmams.users
    SET password_hash = ${sqlText(bcryptHash)},
        must_change_password = ${forceChange ? 'TRUE' : 'FALSE'},
        password_updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${Number(user.user_id)};
  `);

  await authService.revokeAllSessionsForUser(appId);

  console.log(
    JSON.stringify(
      {
        success: true,
        accountId: appId,
        email: user.email,
        mustChangePassword: forceChange,
        sessionsRevoked: true,
        message: 'Bcrypt password hash updated in PostgreSQL without exposing credentials.'
      },
      null,
      2
    )
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.audit) {
    await runAudit();
    return;
  }
  if (typeof args.user === 'string' && args.user.trim()) {
    await runPasswordReset(args.user, !args.noForceChange);
    return;
  }

  console.log(
    [
      'APMAMS Safe Password Migration & Account Reset Utility',
      '',
      'Usage:',
      '  npm run auth:audit-hashes',
      '  npm run auth:reset-password -- --user <email|username|app_user_id> [--stdin] [--no-force-change]',
      '',
      'Notes:',
      '  - Never invents passwords for existing accounts.',
      '  - Reads new password from stdin (no plaintext secrets in shell command arguments).',
      '  - Stores only cost-12 bcrypt hashes in apmams.users.password_hash and revokes active sessions.'
    ].join('\n')
  );
}

main().catch(err => {
  console.error('[AuthReset] Unexpected error:', err.message);
  process.exit(1);
});

