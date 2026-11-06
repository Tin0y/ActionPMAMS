import { query } from '../backend/database';

async function main() {
  console.log('=== AUDITING POSTGRESQL CONSTRAINTS IN APMAMS SCHEMA ===');
  
  const fks = await query<any>(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'apmams'
    ORDER BY tc.table_name, kcu.column_name;
  `);

  console.log(`Found ${fks.length} foreign key constraint(s):`);
  fks.forEach((fk: any) => {
    console.log(`- ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (ON DELETE ${fk.delete_rule})`);
  });

  const uniqueConstraints = await query<any>(`
    SELECT tc.table_name, kcu.column_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'apmams'
    ORDER BY tc.table_name, kcu.column_name;
  `);

  console.log(`\nFound ${uniqueConstraints.length} unique constraint(s):`);
  uniqueConstraints.forEach((u: any) => {
    console.log(`- ${u.table_name}.${u.column_name} (${u.constraint_name})`);
  });

  const tables = await query<any>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'apmams'
    ORDER BY table_name;
  `);
  console.log(`\nTables in apmams schema:`, tables.map((t: any) => t.table_name).join(', '));

  process.exit(0);
}

main().catch(err => {
  console.error('Error auditing database:', err);
  process.exit(1);
});

