import { executeRawSql, sqlText } from '../database';
import bcrypt from 'bcryptjs';

const PASSWORDS: Record<string, string> = {
  'alchristian.molina@msunaawan.edu.ph': 'ssc123',
  'cristykc.patajo@msunaawan.edu.ph': 'sscadviser123',
  'kianchristian.estenzo@msunaawan.edu.ph': 'cbit123',
  'lourenmar.chio@msunaawan.edu.ph': 'cbitadviser123',
  'enelrad.cuteron@msunaawan.edu.ph': 'cbitdean123',
  'valesayniel.junio@msunaawan.edu.ph': 'osd123',
  'jozelmicah.mapula@msunaawan.edu.ph': 'ovcsas123',
  'hazelanne.mapula@msunaawan.edu.ph': 'admin123'
};

async function main() {
  console.log('[Password Sync] Updating individual passwords for test accounts in apmams.users...');
  for (const [email, plainPass] of Object.entries(PASSWORDS)) {
    const hash = await bcrypt.hash(plainPass, 12);
    await executeRawSql(`
      UPDATE apmams.users
      SET password_hash = ${sqlText(hash)},
          must_change_password = FALSE,
          password_updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(email) = ${sqlText(email.toLowerCase())};
    `);
    console.log(`[Password Sync] ${email} -> '${plainPass}'`);
  }

  const results = await executeRawSql(`
    SELECT user_id, email, username, student_id, LEFT(password_hash, 10) as hash_prefix 
    FROM apmams.users;
  `);
  console.log('\n[Password Sync] Completed:\n' + results);
}

main().catch(err => {
  console.error('[Password Sync Error]', err);
  process.exit(1);
});

