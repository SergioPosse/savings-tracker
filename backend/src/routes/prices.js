const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../db');

// CoinMarketCap — primary, reliable from cloud IPs
async function fetchCoinMarketCap(symbols) {
  const res = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
    headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY },
    params: { symbol: symbols.join(','), convert: 'USD' },
    timeout: 8000,
  });
  const result = {};
  for (const [sym, data] of Object.entries(res.data.data)) {
    const price = data.quote?.USD?.price;
    if (price) result[sym] = price;
  }
  return result;
}

// CoinPaprika — fallback, free public API, no key, server-friendly
async function fetchCoinPaprika(symbols) {
  const res = await axios.get('https://api.coinpaprika.com/v1/tickers', {
    params: { quotes: 'USD' },
    timeout: 10000,
  });
  const priceMap = {};
  for (const coin of res.data) {
    if (coin.quotes?.USD?.price && !priceMap[coin.symbol]) {
      priceMap[coin.symbol] = coin.quotes.USD.price;
    }
  }
  const result = {};
  for (const sym of symbols) {
    if (priceMap[sym]) result[sym] = priceMap[sym];
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
        if (asks.length) arsPerUsdt = asks[Math.floor(asks.length / 2)];
      } catch (e2) {
        console.error('[prices] criptoya error:', e2.message);
      }
    }
    prices['ARS'] = 1 / arsPerUsdt;

    // Crypto prices — CoinMarketCap primary, CoinPaprika fallback
    if (cryptoSymbols.length > 0) {
      let fetched = {};
      let source = '';

      try {
        fetched = await fetchCoinMarketCap(cryptoSymbols);
        source = 'CoinMarketCap';
      } catch (e) {
        console.error('[prices] CoinMarketCap error:', e.message, '— trying CoinPaprika...');
        try {
          fetched = await fetchCoinPaprika(cryptoSymbols);
          source = 'CoinPaprika';
        } catch (e2) {
          console.error('[prices] CoinPaprika error:', e2.message);
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
