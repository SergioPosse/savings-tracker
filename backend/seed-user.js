require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.APP_PASSWORD || 'admin123';

  console.log(`\nBuscando usuario "${username}"...`);
  const existing = await pool.query('SELECT * FROM users');
  console.log(`Usuarios en la DB: ${existing.rows.map(u => u.username).join(', ') || 'ninguno'}`);

  const found = existing.rows.find(u => u.username === username);
  if (found) {
    console.log(`✓ El usuario "${username}" ya existe (id=${found.id})`);
  } else {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET password_hash = $2 RETURNING id',
      [username, hash]
    );
    console.log(`✓ Usuario "${username}" creado (id=${result.rows[0].id})`);
  }

  const userId = found?.id ?? (await pool.query('SELECT id FROM users WHERE username=$1', [username])).rows[0].id;

  // Assign orphaned records
  const a = await pool.query('UPDATE assets SET user_id=$1 WHERE user_id IS NULL RETURNING id', [userId]);
  const p = await pool.query('UPDATE platforms SET user_id=$1 WHERE user_id IS NULL RETURNING id', [userId]);

  const total = await pool.query('SELECT COUNT(*) FROM assets WHERE user_id=$1', [userId]);
  console.log(`✓ Activos asignados ahora: ${a.rowCount} nuevos, ${total.rows[0].count} total`);
  console.log(`✓ Plataformas asignadas: ${p.rowCount} nuevas`);
  console.log(`\nListo. Entrá con: ${username} / ${password}\n`);

  await pool.end();
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
