import { useState } from 'react';
import { X, Pencil, Trash2, Check, Plus } from 'lucide-react';
import { createPlatform, updatePlatform, deletePlatform } from '../api/platforms';
import type { Platform } from '../types';

interface Props {
  platforms: Platform[];
  onClose: () => void;
  onChanged: () => void;
}

interface EditingState {
  id: number;
  name: string;
  color: string;
}

export default function ManagePlatformsModal({ platforms, onClose, onChanged }: Props) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  const startEdit = (p: Platform) => setEditing({ id: p.id, name: p.name, color: p.color });

  const saveEdit = async () => {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    try {
      await updatePlatform(editing.id, editing.name.trim(), editing.color);
      onChanged();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar la plataforma "${name}"?`)) return;
    await deletePlatform(id);
    onChanged();
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createPlatform(newName.trim(), newColor);
      onChanged();
      setAdding(false);
      setNewName('');
      setNewColor('#6366f1');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
          <h2 className="text-lg font-semibold text-white">Plataformas / Wallets</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
          {platforms.map(p => (
            <div key={p.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#21262d] transition-colors group">
              {editing?.id === p.id ? (
                <>
                  <input
                    type="color"
                    value={editing.color}
                    onChange={e => setEditing(prev => prev ? { ...prev, color: e.target.value } : null)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0"
                  />
                  <input
                    value={editing.name}
                    onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : null)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }}
                    autoFocus
                    className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="p-1.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="p-1.5 text-gray-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="flex-1 text-sm text-gray-200">{p.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(p)}
                      className="p-1.5 text-gray-500 hover:text-blue-400 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {adding ? (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[#21262d]">
              <input
                type="color"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0"
              />
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
                autoFocus
                placeholder="Nombre..."
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
                className="p-1.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setAdding(false)} className="p-1.5 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-[#21262d] transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Nueva plataforma
            </button>
          )}
        </div>

        <div className="p-4 border-t border-[#30363d]">
          <button
            onClick={onClose}
            className="w-full bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
