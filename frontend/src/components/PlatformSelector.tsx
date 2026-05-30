import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { createPlatform } from '../api/platforms';
import type { Platform } from '../types';

interface Props {
  platforms: Platform[];
  value: string;
  onChange: (name: string) => void;
  onPlatformCreated: (p: Platform) => void;
}

export default function PlatformSelector({ platforms, value, onChange, onPlatformCreated }: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await createPlatform(newName.trim(), newColor);
      onPlatformCreated(created);
      onChange(created.name);
      setAdding(false);
      setNewName('');
      setNewColor('#6366f1');
    } finally {
      setSaving(false);
    }
  };

  const selected = platforms.find(p => p.name === value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <select
          value={value}
          onChange={e => {
            if (e.target.value === '__new__') {
              setAdding(true);
            } else {
              setAdding(false);
              onChange(e.target.value);
            }
          }}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 appearance-none pr-8"
          style={{ paddingLeft: selected ? '2.25rem' : undefined }}
        >
          {platforms.map(p => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
          <option value="__new__">+ Nueva plataforma...</option>
        </select>
        {selected && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none"
            style={{ backgroundColor: selected.color }}
          />
        )}
      </div>

      {adding && (
        <div className="flex gap-2 items-center bg-[#0d1117] border border-[#30363d] rounded-lg p-2">
          <input
            type="color"
            value={newColor}
            onChange={e => setNewColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
            title="Elegir color"
          />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nombre de plataforma"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAdding(false); }}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={saving || !newName.trim()}
            className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
          >
            {saving ? <Plus className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setAdding(false)}
            className="p-1 text-gray-500 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
