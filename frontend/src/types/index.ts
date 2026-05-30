export interface Asset {
  id: number;
  name: string;
  symbol: string;
  platform: string;
  quantity: number;
  annual_interest_rate: number;
  quote_currency: string;
  icon?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetWithValue extends Asset {
  priceUsdt: number;
  valueUsdt: number;
  valueArs: number;
  monthlyEarnUsdt: number;
  annualEarnUsdt: number;
  monthlyEarnArs: number;
  annualEarnArs: number;
}

export interface PricesData {
  prices: Record<string, number>;
  arsPerUsdt: number;
  timestamp: string;
}

export interface Transaction {
  id: number;
  asset_id: number;
  amount: number;
  note: string;
  created_at: string;
}

export const KNOWN_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether USD' },
  { symbol: 'SHIB', name: 'Shiba Inu' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'NEXO', name: 'Nexo' },
  { symbol: 'ARS', name: 'Pesos Argentinos' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'USDC', name: 'USD Coin' },
];

export interface Platform {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export const PLATFORMS = ['Binance', 'Nexo', 'MetaMask', 'PPI', 'Lemon', 'Ripio', 'Bybit', 'Otro'];
