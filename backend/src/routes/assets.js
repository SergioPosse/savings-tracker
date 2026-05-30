const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM assets WHERE user_id = $1 ORDER BY created_at ASC', [req.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, symbol, platform, quantity, annual_interest_rate, quote_currency } = req.body;
    const result = await pool.query(
      `INSERT INTO assets (name, symbol, platform, quantity, annual_interest_rate, quote_currency, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, symbol.toUpperCase(), platform || '', parseFloat(quantity) || 0, parseFloat(annual_interest_rate) || 0, quote_currency || 'USDT', req.userId]
    );
    if (parseFloat(quantity) > 0) {
      await pool.query(
        'INSERT INTO transactions (asset_id, amount, note) VALUES ($1, $2, $3)',
        [result.rows[0].id, parseFloat(quantity), 'Saldo inicial']
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/add', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;
    await pool.query(
      'UPDATE assets SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
      [parseFloat(amount), id, req.userId]
    );
    await pool.query(
      'INSERT INTO transactions (asset_id, amount, note) VALUES ($1, $2, $3)',
      [id, parseFloat(amount), note || '']
    );
    const result = await pool.query('SELECT * FROM assets WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, platform, annual_interest_rate, quantity, icon } = req.body;
    const result = await pool.query(
      `UPDATE assets SET name=$1, platform=$2, annual_interest_rate=$3, quantity=$4, icon=$5, updated_at=CURRENT_TIMESTAMP
       WHERE id=$6 AND user_id=$7 RETURNING *`,
      [name, platform || '', parseFloat(annual_interest_rate) || 0, parseFloat(quantity), icon ?? null, id, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM assets WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/transactions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.* FROM transactions t
       JOIN assets a ON a.id = t.asset_id
       WHERE t.asset_id = $1 AND a.user_id = $2
       ORDER BY t.created_at DESC LIMIT 50`,
      [req.params.id, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
