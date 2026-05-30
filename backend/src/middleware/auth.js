const bcrypt = require('bcryptjs');
const { pool } = require('../db');

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');
    const username = decoded.slice(0, colonIndex);
    const password = decoded.slice(colonIndex + 1);

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (!result.rows.length) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    req.userId = user.id;
    req.username = user.username;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = authMiddleware;
