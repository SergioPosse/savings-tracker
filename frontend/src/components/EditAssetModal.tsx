import { useState, useEffect, useRef } from 'react';
import { X, Camera, Trash2 } from 'lucide-react';
import { updateAsset } from '../api/assets';
import { getPlatforms } from '../api/platforms';
import type { Asset, Platform } from '../types';
import PlatformSelector from './PlatformSelector';

interface Props {
  asset: Asset;
  onClose: () => void;
  onUpdated: () => void;
}

const MAX_FILE_BYTES = 200 * 1024; // 200 KB

export default function EditAssetModal({ asset, onClose, onUpdated }: Props) {
  const [name, setName] = useState(asset.name);
  const [platform, setPlatform] = useState(asset.platform);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [interestRate, setInterestRate] = useState(String(asset.annual_interest_rate));
  const [quantity, setQuantity] = useState(String(asset.quantity));
  const [icon, setIcon] = useState<string | null>(asset.icon ?? null);
  const [iconError, setIconError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPlatforms().then(ps => {
      setPlatforms(ps);
      if (!ps.find(p => p.name === asset.platform) && ps.length > 0) {
        setPlatform(ps[0].name);
      }
    });
  }, [asset.platform]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIconError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setIconError('Solo se permiten imágenes.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setIconError(`El archivo supera el máximo de 200 KB (${(file.size / 1024).toFixed(0)} KB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => setIcon(ev.target?.result as string);
    reader.readAsDataURL(file);
    // reset input so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateAsset(asset.id, {
        name,
        platform,
        annual_interest_rate: parseFloat(interestRate) || 0,
        quantity: parseFloat(quantity),
        icon,
      });
      onUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const platformColor = platforms.find(p => p.name === platform)?.color ?? '#6b7280';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
          <div>
            <h2 className="text-lg font-semibold text-white">Editar activo</h2>
            <p className="text-xs text-gray-500 mt-0.5">{asset.symbol}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Icon picker */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden cursor-pointer ring-2 ring-offset-2 ring-offset-[#161b22] hover:opacity-80 transition-opacity"
                style={{ backgroundColor: `${platformColor}25`, ringColor: platformColor }}
                onClick={() => fileRef.current?.click()}
              >
                {icon ? (
                  <img src={icon} alt="icon" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold" style={{ color: platformColor }}>
                    {asset.symbol.slice(0, 2)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#30363d] hover:bg-[#484f58] rounded-full flex items-center justify-center transition-colors"
              >
                <Camera className="w-3 h-3 text-gray-300" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-1">Ícono del activo</p>
              <p className="text-xs text-gray-600">PNG, JPG, SVG · Máx. 200 KB · Recomendado 64×64 px</p>
              {iconError && <p className="text-xs text-red-400 mt-1">{iconError}</p>}
              {icon && (
                <button
                  type="button"
                  onClick={() => setIcon(null)}
                  className="mt-1 flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Quitar ícono
                </button>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nombre</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Plataforma</label>
            <PlatformSelector
              platforms={platforms}
              value={platform}
              onChange={setPlatform}
              onPlatformCreated={p => setPlatforms(prev => [...prev, p])}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Cantidad</label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Interés anual (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={interestRate}
                onChange={e => setInterestRate(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
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
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
