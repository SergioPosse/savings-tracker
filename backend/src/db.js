require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const DEFAULT_PLATFORMS = [
  { name: 'Binance',  color: '#F3BA2F' },
  { name: 'Nexo',     color: '#1A6AFF' },
  { name: 'MetaMask', color: '#E2761B' },
  { name: 'PPI',      color: '#1A56DB' },
];

async function initDB() {
  // Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Platforms table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platforms (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, user_id)
    )
  `);

  // Assets table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assets (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      platform TEXT DEFAULT '',
      quantity DECIMAL(24, 8) NOT NULL DEFAULT 0,
      annual_interest_rate DECIMAL(6, 2) DEFAULT 0,
      quote_currency TEXT DEFAULT 'USDT',
      icon TEXT DEFAULT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Transactions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
      amount DECIMAL(24, 8) NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- Migrations for existing installs ---
  await pool.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL`);
  await pool.query(`ALTER TABLE platforms ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);

  // Create default admin user from env vars (only if no users exist yet)
  const { rows } = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(rows[0].count) === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.APP_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, hash]
    );
    const adminId = result.rows[0].id;

    // Assign any existing orphaned data to the admin user
    await pool.query('UPDATE assets SET user_id = $1 WHERE user_id IS NULL', [adminId]);
    await pool.query('UPDATE platforms SET user_id = $1 WHERE user_id IS NULL', [adminId]);

    // Seed default platforms for admin
    for (const p of DEFAULT_PLATFORMS) {
      await pool.query(
        'INSERT INTO platforms (name, color, user_id) VALUES ($1, $2, $3) ON CONFLICT (name, user_id) DO NOTHING',
        [p.name, p.color, adminId]
      );
    }
    console.log(`Default user created: ${username}`);
  } else {
    // Existing install: only assign truly orphaned records
    await pool.query('UPDATE assets SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL');
    await pool.query('UPDATE platforms SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL');
  }

  console.log('Database initialized');
}

module.exports = { pool, initDB };
