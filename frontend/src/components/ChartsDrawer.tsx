import { X } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import type { AssetWithValue, Platform } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  assets: AssetWithValue[];
  platforms: Platform[];
  arsPerUsdt: number;
}

function fmt(n: number, dec = 2) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

const ASSET_COLORS = [
  '#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6',
  '#ec4899','#14b8a6','#a855f7','#f97316','#84cc16',
];

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1c2128] border border-[#30363d] rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-white font-medium">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.color }}>${fmt(payload[0].value)}</p>
    </div>
  );
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1c2128] border border-[#30363d] rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-white font-medium mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-emerald-400">{p.name}: ${fmt(p.value)}</p>
      ))}
    </div>
  );
}

interface DonutSectionProps {
  title: string;
  data: { name: string; value: number; color: string }[];
  totalUsdt: number;
}

function DonutSection({ title, data, totalUsdt }: DonutSectionProps) {
  return (
    <div className="flex flex-col min-h-0">
      <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-2 shrink-0">{title}</h3>
      {data.length === 0 ? (
        <p className="text-gray-600 text-sm">Sin datos</p>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="h-[180px] lg:h-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius="45%" outerRadius="75%" paddingAngle={2} dataKey="value">
                  {data.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 overflow-y-auto mt-1" style={{ maxHeight: '120px' }}>
            {data.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-400 truncate">{d.name}</span>
                </div>
                <div className="flex gap-2 tabular-nums shrink-0 ml-2">
                  <span className="text-gray-600">{totalUsdt > 0 ? ((d.value / totalUsdt) * 100).toFixed(1) : 0}%</span>
                  <span className="text-white">${fmt(d.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChartsDrawer({ open, onClose, assets, platforms, arsPerUsdt }: Props) {
  const getPlatformColor = (name: string, i: number) =>
    platforms.find(p => p.name === name)?.color ?? ASSET_COLORS[i % ASSET_COLORS.length];

  const assetData = assets
    .filter(a => a.valueUsdt > 0)
    .sort((a, b) => b.valueUsdt - a.valueUsdt)
    .map((a, i) => ({
      name: a.platform ? `${a.symbol} · ${a.platform}` : a.symbol,
      value: parseFloat(a.valueUsdt.toFixed(2)),
      color: ASSET_COLORS[i % ASSET_COLORS.length],
    }));

  const platformMap: Record<string, { value: number; color: string }> = {};
  assets.forEach((a, i) => {
    const pName = a.platform || 'Sin plataforma';
    if (!platformMap[pName]) platformMap[pName] = { value: 0, color: getPlatformColor(pName, i) };
    platformMap[pName].value += a.valueUsdt;
  });
  const platformData = Object.entries(platformMap)
    .map(([name, { value, color }]) => ({ name, value: parseFloat(value.toFixed(2)), color }))
    .sort((a, b) => b.value - a.value);

  const earnData = assets
    .filter(a => a.annualEarnUsdt > 0)
    .sort((a, b) => b.annualEarnUsdt - a.annualEarnUsdt)
    .map(a => ({
      name: a.symbol,
      Mensual: parseFloat(a.monthlyEarnUsdt.toFixed(2)),
      Anual: parseFloat(a.annualEarnUsdt.toFixed(2)),
    }));

  const totalUsdt = assets.reduce((s, a) => s + a.valueUsdt, 0);
  const totalMonthly = assets.reduce((s, a) => s + a.monthlyEarnUsdt, 0);
  const totalAnnual = assets.reduce((s, a) => s + a.annualEarnUsdt, 0);
  const totalMonthlyArs = assets.reduce((s, a) => s + a.monthlyEarnArs, 0);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full bg-[#161b22] border-l border-[#30363d] z-50 flex flex-col transition-transform duration-300
          w-full sm:w-[500px] lg:w-[860px]
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d] shrink-0">
          <h2 className="text-base font-semibold text-white">Análisis del portfolio</h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-[#21262d]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content — scrollable on mobile, fits viewport on desktop */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-5">

          {/* Desktop: grid 2 cols for donuts | Mobile: stacked */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 h-full lg:grid-rows-[1fr_auto]">

            {/* Top row: two donuts */}
            <div className="bg-[#1c2128] rounded-xl border border-[#21262d] p-4 flex flex-col lg:min-h-0">
              <DonutSection title="Por activo" data={assetData} totalUsdt={totalUsdt} />
            </div>

            <div className="bg-[#1c2128] rounded-xl border border-[#21262d] p-4 flex flex-col lg:min-h-0">
              <DonutSection title="Por plataforma / wallet" data={platformData} totalUsdt={totalUsdt} />
            </div>

            {/* Bottom row: bar chart + earn summary spanning full width */}
            <div className="lg:col-span-2 bg-[#1c2128] rounded-xl border border-[#21262d] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-gray-400 uppercase tracking-wide">Intereses generados (USD)</h3>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Mensual</p>
                    <p className="text-sm font-semibold text-emerald-400">+${fmt(totalMonthly)}</p>
                    <p className="text-xs text-gray-600">ARS {fmt(totalMonthlyArs, 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Anual</p>
                    <p className="text-sm font-semibold text-emerald-400">+${fmt(totalAnnual)}</p>
                  </div>
                </div>
              </div>

              {earnData.length === 0 ? (
                <p className="text-gray-600 text-sm py-4 text-center">Ningún activo tiene interés configurado</p>
              ) : (
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={earnData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip content={<BarTooltip />} cursor={{ fill: '#ffffff06' }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                      <Bar dataKey="Mensual" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Anual" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
