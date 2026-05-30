const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Datos incompletos' });

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (!result.rows.length) return res.status(401).json({ error: 'Usuario no encontrado' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

    res.json({ success: true, userId: user.id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Datos incompletos' });
    if (password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username.trim(), hash]
    );

    // Seed default platforms for new user
    const DEFAULT_PLATFORMS = [
      { name: 'Binance', color: '#F3BA2F' },
      { name: 'Nexo',    color: '#1A6AFF' },
      { name: 'MetaMask',color: '#E2761B' },
      { name: 'PPI',     color: '#1A56DB' },
    ];
    const userId = result.rows[0].id;
    for (const p of DEFAULT_PLATFORMS) {
      await pool.query(
        'INSERT INTO platforms (name, color, user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [p.name, p.color, userId]
      );
    }

    res.json({ success: true, userId, username: result.rows[0].username });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El usuario ya existe' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
