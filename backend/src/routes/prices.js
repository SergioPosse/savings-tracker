const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../db');

// Map common symbols to CoinGecko IDs
const SYMBOL_TO_CG = {
  BTC:   'bitcoin',
  ETH:   'ethereum',
  USDT:  'tether',
  USDC:  'usd-coin',
  SHIB:  'shiba-inu',
  DOGE:  'dogecoin',
  NEXO:  'nexo',
  BNB:   'binancecoin',
  SOL:   'solana',
  MATIC: 'matic-network',
  POL:   'matic-network',
  XRP:   'ripple',
  ADA:   'cardano',
  AVAX:  'avalanche-2',
  LINK:  'chainlink',
  DOT:   'polkadot',
  LTC:   'litecoin',
  BCH:   'bitcoin-cash',
  UNI:   'uniswap',
  ATOM:  'cosmos',
  DAI:   'dai',
  TRX:   'tron',
};

let priceCache = null;
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 min

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

    // ARS rate from dolarapi.com
    try {
      const dolarRes = await axios.get('https://dolarapi.com/v1/dolares/cripto', { timeout: 6000 });
      arsPerUsdt = dolarRes.data.venta;
      prices['ARS'] = 1 / arsPerUsdt;
    } catch (e) {
      console.error('Error fetching ARS rate:', e.message);
      prices['ARS'] = 1 / arsPerUsdt;
    }

    // Crypto prices from CoinGecko
    const cryptoSymbols = symbols.filter(s => s !== 'ARS' && s !== 'USDT');
    const cgIds = [...new Set(cryptoSymbols.map(s => SYMBOL_TO_CG[s]).filter(Boolean))];

    if (cgIds.length > 0) {
      try {
        const cgRes = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
          params: { ids: cgIds.join(','), vs_currencies: 'usd' },
          timeout: 10000,
          headers: { 'Accept': 'application/json' },
        });
        const cgData = cgRes.data;

        for (const sym of cryptoSymbols) {
          const cgId = SYMBOL_TO_CG[sym];
          if (cgId && cgData[cgId]?.usd) {
            prices[sym] = cgData[cgId].usd;
          }
        }
      } catch (e) {
        console.error('CoinGecko error:', e.message);
      }
    }

    priceCache = { prices, arsPerUsdt, timestamp: new Date().toISOString() };
    lastFetch = now;
    res.json(priceCache);
  } catch (err) {
    console.error('Price fetch error:', err);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

module.exports = router;
