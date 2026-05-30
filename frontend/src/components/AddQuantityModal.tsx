import { useState } from 'react';
import { X } from 'lucide-react';
import { addQuantity } from '../api/assets';
import type { Asset } from '../types';

interface Props {
  asset: Asset;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddQuantityModal({ asset, onClose, onAdded }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed === 0) return;
    setLoading(true);
    setError('');
    try {
      await addQuantity(asset.id, parsed, note);
      onAdded();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
          <div>
            <h2 className="text-lg font-semibold text-white">Agregar cantidad</h2>
            <p className="text-xs text-gray-500 mt-0.5">{asset.name} — {asset.platform}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Cantidad a agregar ({asset.symbol})
            </label>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              required
              autoFocus
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              Actual: {parseFloat(String(asset.quantity)).toLocaleString('es-AR', { maximumFractionDigits: 8 })} {asset.symbol}
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Nota <span className="text-gray-600">opcional</span>
            </label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ej: compra mensual"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !amount}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
