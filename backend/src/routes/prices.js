const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../db');

const SYMBOL_TO_COINGECKO = {
  BTC: 'bitcoin', ETH: 'ethereum', USDC: 'usd-coin', SHIB: 'shiba-inu',
  DOGE: 'dogecoin', NEXO: 'nexo', BNB: 'binancecoin', SOL: 'solana',
  MATIC: 'matic-network', POL: 'polygon-ecosystem-token', XRP: 'ripple', ADA: 'cardano',
  AVAX: 'avalanche-2', LINK: 'chainlink', DOT: 'polkadot', LTC: 'litecoin',
  BCH: 'bitcoin-cash', UNI: 'uniswap', ATOM: 'cosmos', TRX: 'tron',
};

// Binance public API — no key required, very high rate limits
async function fetchBinance(symbols) {
  const res = await axios.get('https://api.binance.com/api/v3/ticker/price', { timeout: 8000 });
  const priceMap = {};
  for (const item of res.data) {
    if (item.symbol.endsWith('USDT')) {
      priceMap[item.symbol.slice(0, -4)] = parseFloat(item.price);
    }
  }
  const result = {};
  for (const sym of symbols) {
    if (priceMap[sym]) result[sym] = priceMap[sym];
  }
  return result;
}

// CoinGecko — fallback, free tier 30 req/min, no key needed
async function fetchCoinGecko(symbols) {
  const ids = [...new Set(symbols.map(s => SYMBOL_TO_COINGECKO[s]).filter(Boolean))];
  if (!ids.length) return {};
  const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
    params: { ids: ids.join(','), vs_currencies: 'usd' },
    timeout: 10000,
  });
  const byId = {};
  for (const [id, val] of Object.entries(res.data)) byId[id] = val.usd;
  const result = {};
  for (const sym of symbols) {
    const id = SYMBOL_TO_COINGECKO[sym];
    if (id && byId[id]) result[sym] = byId[id];
  }
  return result;
}

let priceCache = null;
let lastFetch = 0;
const CACHE_TTL = 60000;

router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (priceCache && now - lastFetch < CACHE_TTL) {
      return res.json(priceCache);
    }

    const { rows } = await pool.query('SELECT DISTINCT symbol FROM assets');
    const symbols = rows.map(r => r.symbol);
    const cryptoSymbols = symbols.filter(s => s !== 'ARS' && s !== 'USDT');

    const prices = { USDT: 1 };
    let arsPerUsdt = 1430;

    // ARS rate — dolarapi.com primary, criptoya.com fallback
    try {
      const r = await axios.get('https://dolarapi.com/v1/dolares/cripto', { timeout: 6000 });
      arsPerUsdt = r.data.venta;
    } catch (e) {
      console.error('[prices] dolarapi error:', e.message, '— trying criptoya...');
      try {
        const r2 = await axios.get('https://criptoya.com/api/usdt/ars/0.1', { timeout: 6000 });
        const asks = Object.values(r2.data)
          .map(x => x.ask)
          .filter(v => typeof v === 'number' && v > 0)
          .sort((a, b) => a - b);
        if (asks.length) arsPerUsdt = asks[Math.floor(asks.length / 2)]; // median ask
      } catch (e2) {
        console.error('[prices] criptoya error:', e2.message);
      }
    }
    prices['ARS'] = 1 / arsPerUsdt;

    // Crypto prices — Binance primary, CoinGecko fallback
    if (cryptoSymbols.length > 0) {
      let fetched = {};
      let source = '';

      try {
        fetched = await fetchBinance(cryptoSymbols);
        source = 'Binance';
      } catch (e) {
        console.error('[prices] Binance error:', e.message, '— trying CoinGecko...');
        try {
          fetched = await fetchCoinGecko(cryptoSymbols);
          source = 'CoinGecko';
        } catch (e2) {
          console.error('[prices] CoinGecko error:', e2.message);
        }
      }

      Object.assign(prices, fetched);
      const fetchedCount = Object.keys(fetched).length;
      console.log(`[prices] ${source || 'NONE'}: fetched ${fetchedCount}/${cryptoSymbols.length} prices`, Object.keys(fetched));

      if (fetchedCount === 0 && cryptoSymbols.length > 0) {
        console.warn('[prices] No crypto prices fetched — NOT caching, will retry next request');
        return res.json({ prices, arsPerUsdt, timestamp: new Date().toISOString() });
      }
    }

    priceCache = { prices, arsPerUsdt, timestamp: new Date().toISOString() };
    lastFetch = now;
    res.json(priceCache);
  } catch (err) {
    console.error('[prices] Fatal error:', err.message);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

module.exports = router;
