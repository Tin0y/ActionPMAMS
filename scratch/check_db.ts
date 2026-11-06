import { query } from '../backend/database';
import bcrypt from 'bcryptjs';

async function main() {
  const users = await query(`
    SELECT user_id, app_user_id, username, email, password_hash
    FROM apmams.users
  `);
  for (const u of users) {
    if (u.password_hash) {
      const matchP123 = await bcrypt.compare('Password123!', u.password_hash);
      const matchApmams = await bcrypt.compare('Apmams2026!', u.password_hash);
      if (matchP123 || matchApmams) {
        console.log(u.email, u.username, matchP123 ? 'Password123!' : 'Apmams2026!');
      } else {
        console.log(u.email, u.username, 'OTHER PASSWORD');
      }
    } else {
      console.log(u.email, u.username, 'NO HASH');
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
