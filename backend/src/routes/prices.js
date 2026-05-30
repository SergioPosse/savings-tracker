const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../db');

let priceCache = null;
let lastFetch = 0;
const CACHE_TTL = 30000;

router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (priceCache && now - lastFetch < CACHE_TTL) {
      return res.json(priceCache);
    }

    const assetsResult = await pool.query('SELECT DISTINCT symbol FROM assets');
    const symbols = assetsResult.rows.map(r => r.symbol);

    const prices = { USDT: 1 };
    let arsPerUsdt = 1430;

    try {
      const dolarRes = await axios.get('https://dolarapi.com/v1/dolares/cripto', { timeout: 5000 });
      arsPerUsdt = dolarRes.data.venta;
      prices['ARS'] = 1 / arsPerUsdt;
    } catch (e) {
      console.error('Error fetching ARS rate:', e.message);
      prices['ARS'] = 1 / arsPerUsdt;
    }

    const cryptoSymbols = symbols.filter(s => s !== 'ARS' && s !== 'USDT');

    await Promise.all(
      cryptoSymbols.map(async (sym) => {
        try {
          const res = await axios.get(
            `https://api.binance.com/api/v3/ticker/price?symbol=${sym}USDT`,
            { timeout: 5000 }
          );
          if (res.data.price) {
            prices[sym] = parseFloat(res.data.price);
          }
        } catch (e) {
          console.error(`Error fetching price for ${sym}:`, e.message);
        }
      })
    );

    priceCache = { prices, arsPerUsdt, timestamp: new Date().toISOString() };
    lastFetch = now;

    res.json(priceCache);
  } catch (err) {
    console.error('Price fetch error:', err);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

module.exports = router;
