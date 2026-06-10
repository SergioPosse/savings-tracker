import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Plus, RefreshCw, LogOut, DollarSign, BarChart2, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { setAuthCredentials } from '../api/client';
import { getAssets, getPrices } from '../api/assets';
import { getPlatforms } from '../api/platforms';
import type { Asset, AssetWithValue, PricesData, Platform } from '../types';
import AssetTable from '../components/AssetTable';
import AddAssetModal from '../components/AddAssetModal';
import ChartsDrawer from '../components/ChartsDrawer';
import ManagePlatformsModal from '../components/ManagePlatformsModal';

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function computeAssetsWithValues(assets: Asset[], pricesData: PricesData): AssetWithValue[] {
  return assets.map(asset => {
    const qty = parseFloat(String(asset.quantity));
    const priceUsdt = pricesData.prices[asset.symbol] ?? 0;
    const valueUsdt = asset.symbol === 'ARS'
      ? qty / pricesData.arsPerUsdt
      : qty * priceUsdt;
    const valueArs = valueUsdt * pricesData.arsPerUsdt;
    const annualEarnUsdt = asset.annual_interest_rate > 0
      ? valueUsdt * (parseFloat(String(asset.annual_interest_rate)) / 100)
      : 0;
    const monthlyEarnUsdt = annualEarnUsdt / 12;
    return {
      ...asset,
      priceUsdt: asset.symbol === 'ARS' ? 1 / pricesData.arsPerUsdt : priceUsdt,
      valueUsdt,
      valueArs,
      annualEarnUsdt,
      monthlyEarnUsdt,
      annualEarnArs: annualEarnUsdt * pricesData.arsPerUsdt,
      monthlyEarnArs: monthlyEarnUsdt * pricesData.arsPerUsdt,
    };
  });
}

export default function Dashboard() {
  const { logout, auth } = useAuth();

  useEffect(() => {
    if (auth.username && auth.password) setAuthCredentials(auth.username, auth.password);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [assets, setAssets] = useState<AssetWithValue[]>([]);
  const [pricesData, setPricesData] = useState<PricesData | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showManagePlatforms, setShowManagePlatforms] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError('');
    try {
      const [rawAssets, prices, pls] = await Promise.all([getAssets(), getPrices(), getPlatforms()]);
      setPricesData(prices);
      setPlatforms(pls);
      setAssets(computeAssetsWithValues(rawAssets, prices));
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keep Render alive + auto-refresh prices every 4 minutes while tab is open
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalUsdt = assets.reduce((s, a) => s + a.valueUsdt, 0);
  const totalArs = assets.reduce((s, a) => s + a.valueArs, 0);
  const totalMonthlyEarnUsdt = assets.reduce((s, a) => s + a.monthlyEarnUsdt, 0);
  const totalAnnualEarnUsdt = assets.reduce((s, a) => s + a.annualEarnUsdt, 0);
  const totalMonthlyEarnArs = assets.reduce((s, a) => s + a.monthlyEarnArs, 0);

  useEffect(() => {
    if (!loading && totalArs > 0) {
      document.title = `📈 $${fmt(totalArs, 0)} ARS — Savings Tracker`;
    }
    return () => { document.title = 'Savings Tracker'; };
  }, [totalArs, loading]);

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <header className="bg-[#161b22] border-b border-[#30363d] sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-white text-sm">Savings Tracker</span>
            {auth.username && (
              <span className="text-xs text-gray-600 hidden sm:block">/ {auth.username}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {lastUpdated && (
              <span className="text-xs text-gray-600 hidden sm:block mr-1">
                {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => setShowCharts(true)}
              className="flex items-center gap-1.5 p-2 text-gray-500 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors"
              title="Ver gráficos"
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:block text-sm">Gráficos</span>
            </button>
            <button
              onClick={() => setShowManagePlatforms(true)}
              className="flex items-center gap-1.5 p-2 text-gray-500 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors"
              title="Gestionar wallets"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:block text-sm">Wallets</span>
            </button>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors"
              title="Actualizar cotizaciones"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:block">Nuevo activo</span>
            </button>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Total Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-2 lg:col-span-1 bg-[#161b22] rounded-xl border border-[#30363d] p-4">
            <p className="text-xs text-gray-500 mb-1">TOTAL EN USDT</p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {loading ? '—' : `$${fmt(totalUsdt)}`}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">USD</p>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-[#161b22] rounded-xl border border-[#30363d] p-4">
            <p className="text-xs text-gray-500 mb-1">TOTAL EN PESOS</p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {loading ? '—' : fmt(totalArs, 0)}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">ARS</p>
          </div>

          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">EARN MENSUAL</p>
                <p className="text-xl font-bold text-emerald-400 tabular-nums">
                  {loading ? '—' : `+$${fmt(totalMonthlyEarnUsdt)}`}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {!loading && `ARS ${fmt(totalMonthlyEarnArs, 0)}`}
                </p>
              </div>
              <DollarSign className="w-5 h-5 text-emerald-400/30" />
            </div>
          </div>

          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">EARN ANUAL</p>
                <p className="text-xl font-bold text-emerald-400 tabular-nums">
                  {loading ? '—' : `+$${fmt(totalAnnualEarnUsdt)}`}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">USD</p>
              </div>
              <BarChart2 className="w-5 h-5 text-emerald-400/30" />
            </div>
          </div>
        </div>

        {/* Exchange Rates Bar */}
        {pricesData && (
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-4">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Cotizaciones</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div>
                <span className="text-xs text-gray-500">Dólar Crypto </span>
                <span className="text-sm font-medium text-white">${fmt(pricesData.arsPerUsdt, 0)} ARS</span>
              </div>
              {Object.entries(pricesData.prices)
                .filter(([sym]) => sym !== 'USDT' && sym !== 'ARS')
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([sym, price]) => (
                  <div key={sym}>
                    <span className="text-xs text-gray-500">{sym}/USDT </span>
                    <span className="text-sm font-medium text-white">
                      ${price < 0.01
                        ? price.toLocaleString('es-AR', { maximumSignificantDigits: 4 })
                        : fmt(price)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Asset Table */}
        {loading ? (
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-12 text-center text-gray-500">
            Cargando activos y cotizaciones...
          </div>
        ) : (
          <AssetTable assets={assets} platforms={platforms} onRefresh={() => fetchData()} />
        )}
      </main>

      {showAddModal && (
        <AddAssetModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => fetchData()}
        />
      )}

      <ChartsDrawer
        open={showCharts}
        onClose={() => setShowCharts(false)}
        assets={assets}
        platforms={platforms}
        arsPerUsdt={pricesData?.arsPerUsdt ?? 1430}
      />

      {showManagePlatforms && (
        <ManagePlatformsModal
          platforms={platforms}
          onClose={() => setShowManagePlatforms(false)}
          onChanged={() => { fetchData(); }}
        />
      )}
    </div>
  );
}
