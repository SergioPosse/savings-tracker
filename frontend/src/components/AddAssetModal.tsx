import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createAsset } from '../api/assets';
import { getPlatforms } from '../api/platforms';
import { KNOWN_SYMBOLS } from '../types';
import type { Platform } from '../types';
import PlatformSelector from './PlatformSelector';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function AddAssetModal({ onClose, onCreated }: Props) {
  const [symbol, setSymbol] = useState('BTC');
  const [customSymbol, setCustomSymbol] = useState('');
  const [name, setName] = useState('Bitcoin');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platform, setPlatform] = useState('Binance');
  const [quantity, setQuantity] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPlatforms().then(ps => {
      setPlatforms(ps);
      if (ps.length > 0) setPlatform(ps[0].name);
    });
  }, []);

  const handleSymbolChange = (val: string) => {
    setSymbol(val);
    const known = KNOWN_SYMBOLS.find(s => s.symbol === val);
    if (known) setName(known.name);
  };

  const finalSymbol = symbol === 'OTRO' ? customSymbol.toUpperCase() : symbol;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalSymbol || !name) return;
    setLoading(true);
    setError('');
    try {
      await createAsset({
        name,
        symbol: finalSymbol,
        platform,
        quantity: parseFloat(quantity) || 0,
        annual_interest_rate: parseFloat(interestRate) || 0,
        quote_currency: 'USDT',
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear activo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
          <h2 className="text-lg font-semibold text-white">Nuevo Activo</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Símbolo</label>
              <select
                value={symbol}
                onChange={e => handleSymbolChange(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {KNOWN_SYMBOLS.map(s => (
                  <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
                ))}
                <option value="OTRO">Otro...</option>
              </select>
            </div>

            {symbol === 'OTRO' ? (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Símbolo personalizado</label>
                <input
                  value={customSymbol}
                  onChange={e => setCustomSymbol(e.target.value.toUpperCase())}
                  placeholder="ej: MATIC"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Nombre</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {symbol === 'OTRO' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nombre</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Plataforma / Wallet</label>
            <PlatformSelector
              platforms={platforms}
              value={platform}
              onChange={setPlatform}
              onPlatformCreated={p => setPlatforms(prev => [...prev, p])}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Cantidad inicial</label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Interés anual (%) <span className="text-gray-600">opcional</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={interestRate}
                onChange={e => setInterestRate(e.target.value)}
                placeholder="0"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !finalSymbol || !name}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Creando...' : 'Crear activo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
