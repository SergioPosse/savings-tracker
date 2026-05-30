import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, History, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { deleteAsset, getTransactions } from '../api/assets';
import type { AssetWithValue, Transaction, Platform } from '../types';
import AddQuantityModal from './AddQuantityModal';
import EditAssetModal from './EditAssetModal';

interface Props {
  assets: AssetWithValue[];
  platforms: Platform[];
  onRefresh: () => void;
}

type SortCol = 'name' | 'platform' | 'quantity' | 'price' | 'valueUsdt' | 'valueArs' | 'interest' | 'monthly' | 'annual';

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtQty(n: number) {
  if (n >= 1000) return fmt(n, 2);
  if (n >= 1) return fmt(n, 4);
  return n.toLocaleString('es-AR', { maximumSignificantDigits: 6 });
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol | null; sortDir: 'asc' | 'desc' }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30 inline ml-1" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-emerald-400 inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-emerald-400 inline ml-1" />;
}

function TransactionsModal({ assetName, assetId, onClose }: { assetName: string; assetId: number; onClose: () => void }) {
  const [txs, setTxs] = useState<Transaction[] | null>(null);

  useEffect(() => {
    getTransactions(assetId).then(setTxs);
  }, [assetId]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
          <h2 className="text-lg font-semibold text-white">Historial — {assetName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 p-3">
          {!txs && <p className="text-gray-500 text-sm p-2">Cargando...</p>}
          {txs && txs.length === 0 && <p className="text-gray-500 text-sm p-2">Sin transacciones</p>}
          {txs && txs.map(tx => (
            <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#21262d] transition-colors">
              <div>
                <p className="text-sm text-white">{tx.note || 'Movimiento'}</p>
                <p className="text-xs text-gray-500">
                  {new Date(tx.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className={`text-sm font-medium ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {tx.amount >= 0 ? '+' : ''}{fmtQty(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AssetTable({ assets, platforms, onRefresh }: Props) {
  const [addQtyAsset, setAddQtyAsset] = useState<AssetWithValue | null>(null);
  const [editAsset, setEditAsset] = useState<AssetWithValue | null>(null);
  const [historyAsset, setHistoryAsset] = useState<AssetWithValue | null>(null);
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const getPlatformColor = (name: string) =>
    platforms.find(p => p.name === name)?.color ?? '#6b7280';

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortedAssets = [...assets].sort((a, b) => {
    if (!sortCol) return 0;
    let va: number | string = 0;
    let vb: number | string = 0;
    switch (sortCol) {
      case 'name':     va = a.name.toLowerCase();                     vb = b.name.toLowerCase(); break;
      case 'platform': va = a.platform.toLowerCase();                 vb = b.platform.toLowerCase(); break;
      case 'quantity': va = parseFloat(String(a.quantity));           vb = parseFloat(String(b.quantity)); break;
      case 'price':    va = a.priceUsdt;                              vb = b.priceUsdt; break;
      case 'valueUsdt':va = a.valueUsdt;                              vb = b.valueUsdt; break;
      case 'valueArs': va = a.valueArs;                               vb = b.valueArs; break;
      case 'interest': va = parseFloat(String(a.annual_interest_rate));vb = parseFloat(String(b.annual_interest_rate)); break;
      case 'monthly':  va = a.monthlyEarnUsdt;                        vb = b.monthlyEarnUsdt; break;
      case 'annual':   va = a.annualEarnUsdt;                         vb = b.annualEarnUsdt; break;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleDelete = async (asset: AssetWithValue) => {
    if (!confirm(`¿Eliminar ${asset.name} (${asset.platform})?`)) return;
    await deleteAsset(asset.id);
    onRefresh();
  };

  const thClass = (col: SortCol) =>
    `px-4 py-3 text-xs font-medium cursor-pointer select-none transition-colors whitespace-nowrap
     ${sortCol === col ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`;

  return (
    <>
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#30363d] bg-[#1c2128]">
                <th className={`text-left ${thClass('name')}`} onClick={() => handleSort('name')}>
                  ACTIVO <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`text-left ${thClass('platform')}`} onClick={() => handleSort('platform')}>
                  WALLET <SortIcon col="platform" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`text-right ${thClass('quantity')}`} onClick={() => handleSort('quantity')}>
                  CANTIDAD <SortIcon col="quantity" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`text-right ${thClass('price')}`} onClick={() => handleSort('price')}>
                  PRECIO <SortIcon col="price" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`text-right ${thClass('valueUsdt')}`} onClick={() => handleSort('valueUsdt')}>
                  VALOR USDT <SortIcon col="valueUsdt" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`text-right ${thClass('valueArs')}`} onClick={() => handleSort('valueArs')}>
                  VALOR ARS <SortIcon col="valueArs" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`text-right ${thClass('interest')}`} onClick={() => handleSort('interest')}>
                  INT. ANUAL <SortIcon col="interest" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`text-right ${thClass('monthly')}`} onClick={() => handleSort('monthly')}>
                  EARN/MES <SortIcon col="monthly" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`text-right ${thClass('annual')}`} onClick={() => handleSort('annual')}>
                  EARN/AÑO <SortIcon col="annual" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sortedAssets.map(asset => {
                const color = getPlatformColor(asset.platform);
                const rowBg = asset.platform ? hexToRgba(color, 0.06) : 'transparent';
                const borderColor = asset.platform ? hexToRgba(color, 0.15) : '#21262d';

                return (
                  <tr
                    key={asset.id}
                    className="transition-colors hover:brightness-125"
                    style={{ backgroundColor: rowBg, borderBottom: `1px solid ${borderColor}` }}
                  >
                    {/* Activo */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
                          style={{ backgroundColor: hexToRgba(color, 0.15), color }}
                        >
                          {asset.icon
                            ? <img src={asset.icon} alt={asset.symbol} className="w-full h-full object-cover" />
                            : asset.symbol.slice(0, 2)
                          }
                        </div>
                        <p className="text-white font-medium leading-tight">{asset.name}</p>
                      </div>
                    </td>

                    {/* Wallet */}
                    <td className="px-4 py-3">
                      {asset.platform ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: hexToRgba(color, 0.15), color }}
                          >
                            {asset.platform}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Cantidad */}
                    <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                      {fmtQty(parseFloat(String(asset.quantity)))}
                      <span className="text-gray-500 ml-1 text-xs">{asset.symbol}</span>
                    </td>

                    {/* Precio */}
                    <td className="px-4 py-3 text-right text-gray-400 tabular-nums text-xs">
                      {asset.symbol === 'ARS'
                        ? '—'
                        : asset.priceUsdt > 0
                          ? `$${fmt(asset.priceUsdt, asset.priceUsdt < 0.01 ? 8 : 2)}`
                          : <span className="text-gray-600">N/A</span>}
                    </td>

                    {/* Valor USDT */}
                    <td className="px-4 py-3 text-right text-white font-medium tabular-nums">
                      ${fmt(asset.valueUsdt)}
                    </td>

                    {/* Valor ARS */}
                    <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                      {fmt(asset.valueArs, 0)}
                    </td>

                    {/* Interés */}
                    <td className="px-4 py-3 text-right tabular-nums">
                      {asset.annual_interest_rate > 0 ? (
                        <span className="text-yellow-400">{fmt(parseFloat(String(asset.annual_interest_rate)), 1)}%</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* Earn mensual */}
                    <td className="px-4 py-3 text-right tabular-nums">
                      {asset.monthlyEarnUsdt > 0
                        ? <span className="text-emerald-400">+${fmt(asset.monthlyEarnUsdt, 2)}</span>
                        : <span className="text-gray-600">—</span>}
                    </td>

                    {/* Earn anual */}
                    <td className="px-4 py-3 text-right tabular-nums">
                      {asset.annualEarnUsdt > 0
                        ? <span className="text-emerald-400">+${fmt(asset.annualEarnUsdt, 2)}</span>
                        : <span className="text-gray-600">—</span>}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setAddQtyAsset(asset)} className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors" title="Agregar cantidad">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditAsset(asset)} className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-colors" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setHistoryAsset(asset)} className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-white/5 rounded-lg transition-colors" title="Historial">
                          <History className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(asset)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {assets.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    No hay activos. Agregá uno con el botón de arriba.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addQtyAsset && (
        <AddQuantityModal asset={addQtyAsset} onClose={() => setAddQtyAsset(null)} onAdded={onRefresh} />
      )}
      {editAsset && (
        <EditAssetModal asset={editAsset} onClose={() => setEditAsset(null)} onUpdated={onRefresh} />
      )}
      {historyAsset && (
        <TransactionsModal assetId={historyAsset.id} assetName={historyAsset.name} onClose={() => setHistoryAsset(null)} />
      )}
    </>
  );
}
