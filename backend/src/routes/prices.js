const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../db');

const SYMBOL_TO_COINCAP = {
  BTC: 'bitcoin', ETH: 'ethereum', USDC: 'usd-coin', SHIB: 'shiba-inu',
  DOGE: 'dogecoin', NEXO: 'nexo', BNB: 'binance-coin', SOL: 'solana',
  MATIC: 'polygon', POL: 'polygon', XRP: 'xrp', ADA: 'cardano',
  AVAX: 'avalanche', LINK: 'chainlink', DOT: 'polkadot', LTC: 'litecoin',
  BCH: 'bitcoin-cash', UNI: 'uniswap', ATOM: 'cosmos', TRX: 'tron',
};

// CryptoCompare — no API key, works from cloud IPs
async function fetchCryptoCompare(symbols) {
  const fsyms = symbols.join(',');
  const res = await axios.get('https://min-api.cryptocompare.com/data/pricemulti', {
    params: { fsyms, tsyms: 'USD' },
    timeout: 8000,
  });
  const result = {};
  for (const [sym, val] of Object.entries(res.data)) {
    if (val.USD) result[sym] = val.USD;
  }
  return result;
}

// CoinCap — fallback
async function fetchCoinCap(symbols) {
  const ids = [...new Set(symbols.map(s => SYMBOL_TO_COINCAP[s]).filter(Boolean))];
  if (!ids.length) return {};
  const res = await axios.get('https://api.coincap.io/v2/assets', {
    params: { ids: ids.join(','), limit: 50 },
    timeout: 8000,
  });
  const result = {};
  const byId = {};
  for (const a of res.data.data) byId[a.id] = parseFloat(a.priceUsd);
  for (const sym of symbols) {
    const id = SYMBOL_TO_COINCAP[sym];
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

    // ARS rate
    try {
      const r = await axios.get('https://dolarapi.com/v1/dolares/cripto', { timeout: 6000 });
      arsPerUsdt = r.data.venta;
    } catch (e) {
      console.error('[prices] dolarapi error:', e.message);
    }
    prices['ARS'] = 1 / arsPerUsdt;

    // Crypto prices — try CryptoCompare first, then CoinCap
    if (cryptoSymbols.length > 0) {
      let fetched = {};
      let source = '';

      try {
        fetched = await fetchCryptoCompare(cryptoSymbols);
        source = 'CryptoCompare';
      } catch (e) {
        console.error('[prices] CryptoCompare error:', e.message, '— trying CoinCap...');
        try {
          fetched = await fetchCoinCap(cryptoSymbols);
          source = 'CoinCap';
        } catch (e2) {
          console.error('[prices] CoinCap error:', e2.message);
        }
      }

      Object.assign(prices, fetched);
      const fetchedCount = Object.keys(fetched).length;
      console.log(`[prices] ${source || 'NONE'}: fetched ${fetchedCount}/${cryptoSymbols.length} prices`, Object.keys(fetched));

      // Only cache if we actually got crypto prices
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
