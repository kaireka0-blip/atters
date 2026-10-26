import React, { useState } from 'react';
import { Check, Layers, Pencil, Plus, Trash2, X } from 'lucide-react';
import { normalizePackageRegionTag } from '../../../utils/packageRegions';

export interface PackageRegionTag {
  value: string;
  label: string;
  packageCount: number;
  addOnCount: number;
}

interface Props {
  isOpen: boolean;
  regions: PackageRegionTag[];
  isSaving: boolean;
  onClose: () => void;
  onCreate: (value: string) => Promise<void>;
  onRename: (currentValue: string, nextValue: string) => Promise<void>;
  onDelete: (value: string) => Promise<void>;
  onApplyToAll: (value: string) => Promise<void>;
}

const PackageRegionTagsModal: React.FC<Props> = ({
  isOpen,
  regions,
  isSaving,
  onClose,
  onCreate,
  onRename,
  onDelete,
  onApplyToAll,
}) => {
  const [newTag, setNewTag] = useState('');
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const runAction = async (action: () => Promise<void>) => {
    setError('');
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Perubahan tag gagal disimpan.');
    }
  };

  const handleCreate = () => {
    const value = normalizePackageRegionTag(newTag);
    if (!value) {
      setError('Masukkan nama tag wilayah terlebih dahulu.');
      return;
    }
    void runAction(async () => {
      await onCreate(value);
      setNewTag('');
    });
  };

  const handleRename = (currentValue: string) => {
    const nextValue = normalizePackageRegionTag(editLabel);
    if (!nextValue) {
      setError('Nama tag tidak boleh kosong.');
      return;
    }
    void runAction(async () => {
      await onRename(currentValue, nextValue);
      setEditingValue(null);
      setEditLabel('');
    });
  };

  const handleDelete = (region: PackageRegionTag) => {
    const itemCount = region.packageCount + region.addOnCount;
    const itemText = `${region.packageCount} paket dan ${region.addOnCount} Add-On`;
    if (!window.confirm(`Hapus tag “${region.label}”${itemCount ? ` dari ${itemText}` : ''}? Item tetap tersimpan, tetapi wilayahnya akan dikosongkan.`)) return;
    void runAction(() => onDelete(region.value));
  };

  const handleApplyToAll = (region: PackageRegionTag) => {
    if (!window.confirm(`Terapkan tag “${region.label}” ke semua paket dan Add-On? Item yang belum memakai tag ini akan dipindahkan.`)) return;
    void runAction(() => onApplyToAll(region.value));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="package-region-tags-title" className="my-auto flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-brand-border p-4 sm:p-5">
          <div>
            <h2 id="package-region-tags-title" className="flex items-center gap-2 text-base font-bold text-brand-text-primary"><Layers className="h-5 w-5 text-brand-accent" />Kelola Tag Wilayah</h2>
            <p className="mt-1 text-xs text-brand-text-secondary">Ubah tag untuk memperbarui semua item terkait, atau hapus tag tanpa menghapus paketnya.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Tutup" className="rounded-lg p-2 text-brand-text-secondary hover:bg-brand-bg"><X className="h-4 w-4" /></button>
        </header>

        <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
          <form onSubmit={event => { event.preventDefault(); handleCreate(); }} className="flex flex-col gap-2 rounded-xl border border-brand-border bg-brand-bg/60 p-3 sm:flex-row">
            <input value={newTag} onChange={event => setNewTag(event.target.value)} disabled={isSaving} placeholder="Nama tag baru, misalnya Bandung" aria-label="Nama tag wilayah baru" className="input-field min-w-0 flex-1" />
            <button type="submit" disabled={isSaving || !newTag.trim()} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-accent px-3 text-xs font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Tambah Tag</button>
          </form>

          <div className="space-y-2">
            {regions.map(region => (
              <article key={region.value} className="rounded-xl border border-brand-border p-3">
                {editingValue === region.value ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input autoFocus value={editLabel} onChange={event => setEditLabel(event.target.value)} disabled={isSaving} aria-label={`Nama baru untuk ${region.label}`} className="input-field min-w-0 flex-1" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleRename(region.value)} disabled={isSaving || !editLabel.trim()} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-brand-accent px-3 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />Simpan</button>
                      <button type="button" onClick={() => { setEditingValue(null); setEditLabel(''); }} disabled={isSaving} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-brand-border px-3 text-xs font-semibold text-brand-text-secondary"><X className="h-4 w-4" />Batal</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-bold text-brand-text-primary">{region.label}</strong>
                      <span className="text-xs text-brand-text-secondary">{region.packageCount} paket · {region.addOnCount} Add-On</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:justify-end">
                      <button type="button" onClick={() => { setError(''); setEditingValue(region.value); setEditLabel(region.label); }} disabled={isSaving} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-brand-border px-2 text-[11px] font-semibold text-brand-text-secondary hover:border-brand-accent hover:text-brand-accent"><Pencil className="h-3.5 w-3.5" />Edit</button>
                      <button type="button" onClick={() => handleApplyToAll(region)} disabled={isSaving} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-brand-border px-2 text-[11px] font-semibold text-brand-text-secondary hover:border-brand-accent hover:text-brand-accent"><Layers className="h-3.5 w-3.5" />Semua Item</button>
                      <button type="button" onClick={() => handleDelete(region)} disabled={isSaving} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-red-200 px-2 text-[11px] font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Hapus</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
        </div>

        <footer className="flex justify-end border-t border-brand-border p-4 sm:p-5">
          <button type="button" onClick={onClose} disabled={isSaving} className="min-h-10 rounded-lg border border-brand-border px-4 text-sm font-semibold text-brand-text-primary disabled:opacity-50">Selesai</button>
        </footer>
      </section>
    </div>
  );
};

export default PackageRegionTagsModal;
