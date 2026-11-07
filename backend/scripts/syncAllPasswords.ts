import { executeRawSql } from '../database';
import { hashPassword } from '../services/AuthService';

const UNIVERSAL_PASSWORD = 'admin123';

async function main() {
  console.log(`[Password Sync] Hashing "${UNIVERSAL_PASSWORD}" with cost 12...`);
  const hash = await hashPassword(UNIVERSAL_PASSWORD);
  console.log(`[Password Sync] Generated bcrypt hash: ${hash}`);

  console.log('[Password Sync] Updating all user accounts in PostgreSQL apmams.users...');
  await executeRawSql(`
    UPDATE apmams.users 
    SET password_hash = '${hash}', 
        must_change_password = FALSE;
  `);

  await executeRawSql(`
    UPDATE apmams.users 
    SET username = 'admin' 
    WHERE email = 'admin@msunaawan.edu.ph';
  `);

  const results = await executeRawSql(`
    SELECT user_id, email, username, LEFT(password_hash, 10) as hash_prefix, must_change_password 
    FROM apmams.users;
  `);
  console.log('[Password Sync] Users table updated successfully:\n' + results);
}

main().catch(err => {
  console.error('[Password Sync Error]', err);
  process.exit(1);
});

