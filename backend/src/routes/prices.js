const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../db');

const SYMBOL_TO_COINCAP = {
  BTC:   'bitcoin',
  ETH:   'ethereum',
  USDT:  'tether',
  USDC:  'usd-coin',
  SHIB:  'shiba-inu',
  DOGE:  'dogecoin',
  NEXO:  'nexo',
  BNB:   'binance-coin',
  SOL:   'solana',
  MATIC: 'polygon',
  POL:   'polygon',
  XRP:   'xrp',
  ADA:   'cardano',
  AVAX:  'avalanche',
  LINK:  'chainlink',
  DOT:   'polkadot',
  LTC:   'litecoin',
  BCH:   'bitcoin-cash',
  UNI:   'uniswap',
  ATOM:  'cosmos',
  DAI:   'multi-collateral-dai',
  TRX:   'tron',
};

let priceCache = null;
let lastFetch = 0;
const CACHE_TTL = 60000;

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

    // ARS/USDT from dolarapi.com
    try {
      const dolarRes = await axios.get('https://dolarapi.com/v1/dolares/cripto', { timeout: 6000 });
      arsPerUsdt = dolarRes.data.venta;
      prices['ARS'] = 1 / arsPerUsdt;
    } catch (e) {
      console.error('dolarapi error:', e.message);
      prices['ARS'] = 1 / arsPerUsdt;
    }

    // Crypto prices from CoinCap
    const cryptoSymbols = symbols.filter(s => s !== 'ARS' && s !== 'USDT');
    const coincapIds = [...new Set(cryptoSymbols.map(s => SYMBOL_TO_COINCAP[s]).filter(Boolean))];

    if (coincapIds.length > 0) {
      try {
        const ccRes = await axios.get('https://api.coincap.io/v2/assets', {
          params: { ids: coincapIds.join(','), limit: 50 },
          timeout: 10000,
          headers: { 'Accept-Encoding': 'gzip,deflate,compress' },
        });

        const byId = {};
        for (const asset of ccRes.data.data) {
          byId[asset.id] = parseFloat(asset.priceUsd);
        }

        for (const sym of cryptoSymbols) {
          const id = SYMBOL_TO_COINCAP[sym];
          if (id && byId[id]) {
            prices[sym] = byId[id];
          }
        }
        console.log('Prices fetched OK:', Object.keys(prices));
      } catch (e) {
        console.error('CoinCap error:', e.message);
      }
    }

    priceCache = { prices, arsPerUsdt, timestamp: new Date().toISOString() };
    lastFetch = now;
    res.json(priceCache);
  } catch (err) {
    console.error('Price fetch error:', err.message);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

module.exports = router;
