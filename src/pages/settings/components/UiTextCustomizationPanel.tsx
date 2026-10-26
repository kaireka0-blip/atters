import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Save, Search, X } from 'lucide-react';
import { isSupabaseConfigured } from '../../../lib/supabaseClient';
import {
    saveUiTextOverrides,
    UI_TEXT_OPTIONS,
    UiTextOverrides,
    useUiTextOverrides,
} from '../../../utils/uiTextCustomization';
import {
    applyMobileUiScale,
    MOBILE_UI_SCALE_DEFAULT,
    MOBILE_UI_SCALE_MAX,
    MOBILE_UI_SCALE_MIN,
    normalizeMobileUiScale,
    readMobileUiScale,
    saveMobileUiScale,
} from '../../../utils/mobileUiScale';
import {
    MOBILE_UI_SCALE_SYNC_EVENT,
    saveRemoteMobileUiScale,
} from '../../../services/mobileUiScale';

const GROUPS = [
    'Menu',
    'Dashboard',
    'Link Publik',
    'Form Publik',
    'Form Booking Publik',
    'Galeri Publik',
    'Testimoni Publik',
    'Saran Publik',
    'Invoice Publik',
    'Tanda Terima Publik',
    'Profil Vendor Publik',
    'Portofolio Publik',
    'Tabel Data Pengantin',
    'Tabel Calon Pengantin',
    'Tabel Booking',
    'Tabel Acara',
    'Tabel Transaksi',
    'Tabel Arus Kas',
    'Tabel Tim/Vendor',
    'Tabel Invoice',
    'Tabel Laporan Keuangan',
    'Detail Pengantin & Acara',
    'Portal Pengantin',
    'Form Booking Publik', 'Galeri Publik', 'Testimoni Publik', 'Saran Publik',
    'Invoice Publik', 'Tanda Terima Publik', 'Profil Vendor Publik', 'Portofolio Publik',
    'Detail Tim',
    'Rincian Tim/Vendor',
    'Detail Keuangan',
    'Katalog Paket',
    'Detail Paket',
    'Syarat Paket',
    'Status Pembayaran',
];

const PUBLIC_GROUPS = new Set([
    'Link Publik', 'Form Publik', 'Katalog Paket', 'Detail Paket', 'Syarat Paket',
    'Detail Pengantin & Acara', 'Portal Pengantin',
]);

const getGroupOptions = (group: string) => UI_TEXT_OPTIONS.filter(option =>
    group === 'Detail Pengantin & Acara'
        ? option.group === 'Detail Pengantin' || option.group === 'Detail Acara'
        : option.group === group,
);

const normalizeOverrides = (overrides: UiTextOverrides): UiTextOverrides => Object.fromEntries(
    Object.entries(overrides).map(([key, value]) => [key, (value || '').trim()]).filter(([, value]) => value),
);

const UiTextCustomizationPanel: React.FC = () => {
    const savedOverrides = useUiTextOverrides();
    const [savedMobileUiScale, setSavedMobileUiScale] = useState(readMobileUiScale);
    const [mobileUiScale, setMobileUiScale] = useState(savedMobileUiScale);
    const [savingMobileScale, setSavingMobileScale] = useState(false);
    const [mobileScaleError, setMobileScaleError] = useState<string | null>(null);
    const [mobileScaleMessage, setMobileScaleMessage] = useState<string | null>(null);
    const [draft, setDraft] = useState<UiTextOverrides>(savedOverrides);
    const [lastSavedGroup, setLastSavedGroup] = useState<string | null>(null);
    const [savingGroup, setSavingGroup] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [groupScope, setGroupScope] = useState<'all' | 'public' | 'internal'>('all');
    const [activeGroup, setActiveGroup] = useState(GROUPS[0]);
    const tabListRef = useRef<HTMLDivElement>(null);
    const previousSavedRef = useRef(savedOverrides);
    const mobileScaleEditedRef = useRef(false);

    // The scale is loaded and applied globally at startup. This panel only reads
    // the current value and follows late global syncs (e.g. a session recovered
    // after the app started); it is never the trigger that activates the scale.
    useEffect(() => {
        const handleRemoteScaleSync = (event: Event) => {
            // Never clobber a value the user is currently editing.
            if (mobileScaleEditedRef.current) return;
            const scale = (event as CustomEvent<number>).detail;
            if (typeof scale !== 'number') return;
            setMobileUiScale(scale);
            setSavedMobileUiScale(scale);
        };
        window.addEventListener(MOBILE_UI_SCALE_SYNC_EVENT, handleRemoteScaleSync);
        return () => window.removeEventListener(MOBILE_UI_SCALE_SYNC_EVENT, handleRemoteScaleSync);
    }, []);

    useEffect(() => {
        const previousSaved = normalizeOverrides(previousSavedRef.current);
        const nextSaved = normalizeOverrides(savedOverrides);
        setDraft(current => {
            const next = { ...current };
            const keys = new Set([...Object.keys(previousSaved), ...Object.keys(nextSaved)]);
            keys.forEach(key => {
                if (normalizeOverrides({ [key]: current[key] })[key] !== previousSaved[key]) return;
                if (nextSaved[key]) next[key] = nextSaved[key];
                else delete next[key];
            });
            return next;
        });
        previousSavedRef.current = savedOverrides;
    }, [savedOverrides]);

    const normalizedSaved = normalizeOverrides(savedOverrides);
    const normalizedDraft = normalizeOverrides(draft);
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID');
    const previewText = (key: string, fallback: string) => normalizedDraft[key] || fallback;
    const scopedGroups = GROUPS.filter(group => groupScope === 'all'
        || (groupScope === 'public' ? PUBLIC_GROUPS.has(group) : !PUBLIC_GROUPS.has(group)));
    const visibleGroups = scopedGroups.filter(group => getGroupOptions(group).some(option =>
        (!normalizedSearch ||
            `${group} ${option.label} ${option.defaultText} ${normalizedDraft[option.key] || ''}`.toLocaleLowerCase('id-ID').includes(normalizedSearch)),
    ));
    const selectedGroup = visibleGroups.includes(activeGroup) ? activeGroup : visibleGroups[0];
    useEffect(() => {
        const selectedTab = tabListRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
        selectedTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [activeGroup, normalizedSearch, selectedGroup]);
    const changedKeys = [...new Set([...Object.keys(normalizedSaved), ...Object.keys(normalizedDraft)])]
        .filter(key => normalizedSaved[key] !== normalizedDraft[key]);
    const changedKeySet = new Set(changedKeys);

    const hasUnsavedMobileScale = Math.abs(mobileUiScale - savedMobileUiScale) > 0.0001;

    const updateMobileUiScale = (value: number) => {
        mobileScaleEditedRef.current = true;
        setMobileScaleError(null);
        setMobileScaleMessage(null);
        setMobileUiScale(value);
        applyMobileUiScale(value);
    };

    const saveMobileScale = async () => {
        const nextScale = normalizeMobileUiScale(mobileUiScale);
        setSavingMobileScale(true);
        setMobileScaleError(null);
        setMobileScaleMessage(null);
        try {
            if (isSupabaseConfigured) {
                const savedScale = await saveRemoteMobileUiScale(nextScale);
                if (savedScale === undefined) {
                    throw new Error('Supabase tidak mengembalikan hasil penyimpanan.');
                }
                saveMobileUiScale(savedScale);
                setSavedMobileUiScale(savedScale);
                setMobileUiScale(savedScale);
                setMobileScaleMessage('Preferensi disimpan ke akun Supabase ini.');
            } else {
                saveMobileUiScale(nextScale);
                setSavedMobileUiScale(nextScale);
                setMobileScaleMessage('Preferensi disimpan di browser ini saja.');
            }
            mobileScaleEditedRef.current = false;
        } catch (error) {
            setMobileScaleError(error instanceof Error ? error.message : 'Preferensi gagal disimpan ke Supabase.');
        } finally {
            setSavingMobileScale(false);
        }
    };

    const saveGroup = async (group: string) => {
        const groupOptions = getGroupOptions(group);
        if (!groupOptions.some(option => changedKeySet.has(option.key))) return;

        const nextOverrides = { ...normalizedSaved };
        groupOptions.forEach(option => {
            delete nextOverrides[option.key];
            if (normalizedDraft[option.key]) nextOverrides[option.key] = normalizedDraft[option.key];
        });
        setSavingGroup(group);
        setSaveError(null);
        try {
            await saveUiTextOverrides(nextOverrides);
            setLastSavedGroup(group);
            window.setTimeout(() => setLastSavedGroup(current => current === group ? null : current), 2500);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Perubahan gagal disimpan.');
        } finally {
            setSavingGroup(null);
        }
    };

    const resetField = (key: string) => {
        setDraft(current => {
            const next = { ...current };
            delete next[key];
            return next;
        });
        setLastSavedGroup(null);
    };

    const resetGroup = (group: string) => {
        const groupKeys = getGroupOptions(group).map(option => option.key);
        setDraft(current => {
            const next = { ...current };
            groupKeys.forEach(key => delete next[key]);
            return next;
        });
        setLastSavedGroup(null);
    };

    const discardGroup = (group: string) => {
        const groupKeys = getGroupOptions(group).map(option => option.key);
        setDraft(current => {
            const next = { ...current };
            groupKeys.forEach(key => {
                if (normalizedSaved[key]) next[key] = normalizedSaved[key];
                else delete next[key];
            });
            return next;
        });
        setLastSavedGroup(null);
    };

    return (
        <section className="space-y-5">
            <div>
                <h3 className="text-base font-semibold text-brand-text-primary">Kustomisasi Teks</h3>
                <p className="mt-1 text-sm text-brand-text-secondary">
                    Cari teks, ubah, lalu simpan per bagian.{' '}
                    {isSupabaseConfigured
                        ? 'Perubahan disimpan ke akun Supabase ini.'
                        : 'Supabase belum dikonfigurasi; perubahan hanya disimpan di browser ini.'}
                </p>
            </div>

            <div className="rounded-md border border-brand-border bg-brand-surface p-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h4 className="text-sm font-semibold text-brand-text-primary">Ukuran teks dan tampilan mobile</h4>
                        <p className="mt-1 text-xs text-brand-text-secondary">
                            Mengatur teks, harga, ikon, dan tombol pada semua halaman mobile.{' '}
                            {isSupabaseConfigured
                                ? 'Preferensi disimpan ke akun Supabase ini dan digunakan di perangkat lain.'
                                : 'Preferensi disimpan di browser ini saja karena Supabase belum dikonfigurasi.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => updateMobileUiScale(MOBILE_UI_SCALE_DEFAULT)}
                        disabled={savingMobileScale || mobileUiScale === MOBILE_UI_SCALE_DEFAULT}
                        className="inline-flex shrink-0 items-center gap-1 rounded border border-brand-border px-2 py-1 text-xs font-medium text-brand-text-secondary hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset 100%
                    </button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs text-brand-text-secondary">Kecil</span>
                    <input
                        type="range"
                        aria-label="Ukuran teks dan tampilan mobile"
                        min={MOBILE_UI_SCALE_MIN}
                        max={MOBILE_UI_SCALE_MAX}
                        step={0.05}
                        value={mobileUiScale}
                        disabled={savingMobileScale}
                        onChange={event => updateMobileUiScale(Number(event.target.value))}
                        className="min-w-0 flex-1 accent-[#5D87FF]"
                    />
                    <output className="min-w-12 text-right text-sm font-bold tabular-nums text-brand-text-primary">
                        {Math.round(mobileUiScale * 100)}%
                    </output>
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-brand-text-secondary">
                    <span>{Math.round(MOBILE_UI_SCALE_MIN * 100)}%</span>
                    <span>Normal</span>
                    <span>{Math.round(MOBILE_UI_SCALE_MAX * 100)}%</span>
                </div>
                <div className="mt-3 flex justify-end">
                    <button
                        type="button"
                        onClick={saveMobileScale}
                        disabled={!hasUnsavedMobileScale || savingMobileScale}
                        aria-label="Simpan skala mobile"
                        className="button-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {savingMobileScale ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
                {mobileScaleError && <p role="alert" className="mt-2 text-xs font-medium text-red-600">Gagal menyimpan ke Supabase: {mobileScaleError}</p>}
                {mobileScaleMessage && <p role="status" className="mt-2 text-xs font-medium text-emerald-700">{mobileScaleMessage}</p>}
            </div>

            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-secondary" />
                <input
                    aria-label="Cari label atau teks asli"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Cari label atau teks asli..."
                    className="input-field pl-9 pr-10"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        aria-label="Hapus pencarian"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-brand-text-secondary hover:bg-brand-bg"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter bagian kustomisasi">
                {([
                    ['all', 'Semua bagian'],
                    ['public', 'Halaman Publik'],
                    ['internal', 'Halaman Internal'],
                ] as const).map(([scope, label]) => (
                    <button key={scope} type="button" onClick={() => setGroupScope(scope)} aria-pressed={groupScope === scope}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${groupScope === scope ? 'border-brand-accent bg-brand-accent text-white' : 'border-brand-border bg-white text-brand-text-secondary hover:bg-brand-bg'}`}>
                        {label}{scope === 'public' && <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{GROUPS.filter(group => PUBLIC_GROUPS.has(group)).length}</span>}
                    </button>
                ))}
            </div>

            {visibleGroups.length > 0 && (
                <div className="flex min-w-0 items-center gap-1">
                    <button type="button" aria-label="Geser tab ke kiri" onClick={() => tabListRef.current?.scrollBy({ left: -280, behavior: 'smooth' })} className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-white text-brand-text-secondary hover:bg-brand-bg"><ChevronLeft className="h-4 w-4" /></button>
                    <div ref={tabListRef} role="tablist" aria-label="Bagian kustomisasi teks" className="flex min-w-0 flex-1 touch-pan-x snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain rounded-lg border border-brand-border bg-white p-1">
                        {visibleGroups.map(group => {
                            const changedCount = getGroupOptions(group).filter(option => changedKeySet.has(option.key)).length;
                            return (
                                <button key={group} type="button" role="tab" aria-selected={group === selectedGroup}
                                    onClick={() => setActiveGroup(group)}
                                    className={`min-h-10 shrink-0 snap-start rounded-md px-3 py-2 text-xs font-semibold transition-colors ${group === selectedGroup ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-secondary hover:bg-brand-bg hover:text-brand-text-primary'}`}>
                                    {group}{changedCount > 0 && <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${group === selectedGroup ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>{changedCount}</span>}
                                </button>
                            );
                        })}
                    </div>
                    <button type="button" aria-label="Geser tab ke kanan" onClick={() => tabListRef.current?.scrollBy({ left: 280, behavior: 'smooth' })} className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-white text-brand-text-secondary hover:bg-brand-bg"><ChevronRight className="h-4 w-4" /></button>
                </div>
            )}

            {selectedGroup && (() => {
                const group = selectedGroup;
                const groupOptions = getGroupOptions(group);
                const visibleOptions = groupOptions.filter(option => !normalizedSearch ||
                    `${group} ${option.label} ${option.defaultText} ${normalizedDraft[option.key] || ''}`.toLocaleLowerCase('id-ID').includes(normalizedSearch));
                const groupChangeCount = groupOptions.filter(option => changedKeySet.has(option.key)).length;
                const groupHasOverrides = groupOptions.some(option => normalizedDraft[option.key] || normalizedSaved[option.key]);
                const groupHasChanges = groupChangeCount > 0;
                const isTableGroup = group.startsWith('Tabel ');
                const valueFor = (option: typeof groupOptions[number]) => previewText(option.key, option.defaultText);
                const inquiryFields = [
                    ['public.inquiry.name', 'Nama', 'Nama Anda'],
                    ['public.inquiry.whatsapp', 'WhatsApp', '812 3456 7890'],
                    ['public.inquiry.category', 'Kategori Acara', 'Wedding'],
                    ['public.inquiry.source', 'Dari mana kamu mengetahui kami', 'Website'],
                    ['public.inquiry.location', 'Lokasi Acara', 'Kota / Venue'],
                    ['public.inquiry.date', 'Tanggal Acara', 'dd/mm/yyyy'],
                ];

                return (
                    <section role="tabpanel" aria-label={`Kustomisasi ${group}`} className="rounded-xl border border-brand-border bg-white p-3 sm:p-4">
                        <div className="mb-4 flex flex-col gap-2 border-b border-brand-border pb-3 sm:flex-row sm:items-center sm:justify-between">
                            <div><h4 className="text-sm font-semibold text-brand-text-primary">Kustomisasi {group}</h4>
                                <p className="mt-1 text-xs font-medium text-brand-text-secondary">{groupHasChanges ? `${groupChangeCount} perubahan belum disimpan di tab ini` : lastSavedGroup === group ? 'Perubahan tab ini tersimpan' : 'Tidak ada perubahan di tab ini'}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                <button type="button" onClick={() => discardGroup(group)} disabled={!groupHasChanges} className="rounded px-2 py-1 text-xs font-medium text-brand-text-secondary hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-40">Batalkan</button>
                                <button type="button" onClick={() => resetGroup(group)} disabled={!groupHasOverrides} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-brand-text-secondary hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />Reset tab</button>
                                <button type="button" onClick={() => saveGroup(group)} disabled={!groupHasChanges || savingGroup !== null} className="button-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-3.5 w-3.5" />{savingGroup === group ? 'Menyimpan...' : lastSavedGroup === group ? 'Tersimpan' : `Simpan${groupHasChanges ? ` ${groupChangeCount} perubahan` : ''}`}</button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="order-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {visibleOptions.map(option => (
                                    <div key={option.key} className="space-y-2 rounded-md border border-brand-border bg-brand-bg/40 p-3 text-sm text-brand-text-secondary">
                                        <div className="flex items-center justify-between gap-2"><label htmlFor={`ui-text-${option.key}`} className="block font-medium text-brand-text-primary">{option.label}</label>
                                            <button type="button" onClick={() => resetField(option.key)} disabled={!normalizedDraft[option.key] && !normalizedSaved[option.key]} aria-label={`Reset ${option.label}`} title="Reset label ini" className="rounded p-1 text-brand-text-secondary hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" /></button>
                                        </div>
                                        <input id={`ui-text-${option.key}`} value={draft[option.key] ?? ''} onChange={event => { setDraft(current => ({ ...current, [option.key]: event.target.value })); setLastSavedGroup(null); setSaveError(null); }} placeholder="Kosongkan untuk memakai teks asli" className="input-field" />
                                        <div className="space-y-1.5 rounded border border-brand-border bg-white p-2"><p className="break-words text-xs leading-5"><span className="font-semibold text-brand-text-primary">Teks asli:</span> {option.defaultText}</p>
                                            <p aria-live="polite" className="break-words rounded-r border-l-2 border-brand-accent bg-brand-accent/5 py-1 pl-2 text-xs leading-5 text-brand-text-primary"><span className="font-semibold">Akan tampil menjadi:</span> {valueFor(option)}</p>
                                        </div>
                                    </div>
                                ))}
                                {group === 'Dashboard' && <p className="text-xs text-brand-text-secondary md:col-span-2">Gunakan {'{companyName}'} pada judul untuk menampilkan nama usaha.</p>}
                            </div>

                            <aside aria-label={`Pratinjau desain ${group}`} className="order-1 w-full rounded-lg border border-brand-border bg-brand-bg/50 p-3 sm:p-4">
                                <div className="mb-3 flex items-center justify-between gap-2"><div><h5 className="text-sm font-semibold text-brand-text-primary">Lihat desain</h5><p className="text-[11px] text-brand-text-secondary">Contoh tampilan tab {group}</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">Live preview</span></div>
                                {group === 'Detail Pengantin & Acara' ? (
                                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                        <article className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-sm">
                                            <header className="relative isolate overflow-hidden bg-slate-800 px-4 py-5 text-white sm:px-6">
                                                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950" />
                                                <div className="flex items-center gap-4">
                                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/15 text-lg font-black">VA</div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/75">{valueFor(groupOptions.find(option => option.key === 'client.detail.title')!)}</p>
                                                        <h6 className="truncate text-lg font-black">Maya & Dimas</h6>
                                                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold"><span className="rounded-full border border-white/20 bg-white/15 px-2 py-1">Terdaftar 12 Okt 2026</span><span className="rounded-full border border-white/20 bg-white/15 px-2 py-1">2 Acara</span></div>
                                                    </div>
                                                    <div className="hidden gap-2 sm:flex"><span className="rounded-lg border border-white/25 bg-white/15 px-2 py-1.5 text-[10px] font-semibold">{valueFor(groupOptions.find(option => option.key === 'client.detail.action.edit')!)}</span><span className="rounded-lg bg-emerald-700 px-2 py-1.5 text-[10px] font-semibold text-white">{valueFor(groupOptions.find(option => option.key === 'client.detail.action.share')!)}</span></div>
                                                </div>
                                            </header>
                                            <div className="flex gap-1 border-b border-brand-border bg-brand-bg p-1">{['client.detail.tab.events', 'client.detail.tab.payments'].map((key, index) => <span key={key} className={`flex-1 rounded-lg px-2 py-2 text-center text-[10px] font-semibold ${index === 0 ? 'border border-brand-border bg-white text-brand-accent shadow-sm' : 'text-brand-text-secondary'}`}>{valueFor(groupOptions.find(option => option.key === key)!)}</span>)}</div>
                                            <div className="space-y-2 p-3"><h6 className="text-xs font-bold text-brand-text-primary">{valueFor(groupOptions.find(option => option.key === 'client.detail.section.contact')!)}</h6><div className="grid grid-cols-2 gap-2">{[['Nama', 'Maya & Dimas'], ['WhatsApp', '0812 3456 7890'], ['Email', 'maya@email.com'], ['Kota', 'Jakarta']].map(([label, value]) => <div key={label} className="rounded-xl border border-brand-border bg-white p-2"><p className="text-[9px] text-brand-text-secondary">{label}</p><p className="mt-1 truncate text-[10px] font-semibold text-brand-text-primary">{value}</p></div>)}</div><div className="rounded-xl border border-brand-border bg-white p-2"><p className="text-[10px] font-semibold text-brand-text-primary">{valueFor(groupOptions.find(option => option.key === 'client.detail.section.transactions')!)}</p><p className="mt-1 text-[9px] text-brand-text-secondary">Pembayaran acara · 20 Okt 2026</p></div></div>
                                        </article>
                                        <article className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-sm">
                                            <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-brand-text-primary">Pernikahan Maya & Dimas</p><p className="text-[10px] text-brand-text-secondary">PRJ-260018 · 12 Desember 2026</p></div><span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-[9px] font-bold text-white">Aktif</span></header>
                                            <nav className="flex gap-1 overflow-hidden border-b border-slate-200 bg-white px-2 py-2">{['project.detail.tab.info', 'project.detail.tab.meetings', 'project.detail.tab.team', 'project.detail.tab.terms'].map((key, index) => <span key={key} className={`shrink-0 rounded-xl border px-2 py-1.5 text-[9px] font-bold ${index === 0 ? 'border-brand-accent bg-brand-accent text-white' : 'border-slate-200 bg-[#F8FAFC] text-[#5A6A85]'}`}>{valueFor(groupOptions.find(option => option.key === key)!)}</span>)}</nav>
                                            <div className="space-y-3 p-3"><section><h6 className="mb-2 text-xs font-bold text-brand-text-primary">{valueFor(groupOptions.find(option => option.key === 'project.detail.section.main')!)}</h6><div className="grid grid-cols-2 gap-2">{[['project.detail.field.client', 'Maya & Dimas'], ['project.detail.field.location', 'Jakarta'], ['project.detail.field.date', 'Sabtu, 12 Desember 2026']].map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-2"><p className="text-[9px] font-medium text-[#5A6A85]">{valueFor(groupOptions.find(option => option.key === key)!)}</p><p className="mt-1 truncate text-[10px] font-bold text-[#2A3547]">{value}</p></div>)}</div></section><section><h6 className="mb-2 text-xs font-bold text-brand-text-primary">{valueFor(groupOptions.find(option => option.key === 'project.detail.section.status')!)}</h6><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex justify-between text-[10px] font-bold text-[#2A3547]"><span>Progres Pengerjaan</span><span className="text-brand-accent">65%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-2/3 rounded-full bg-brand-accent" /></div></div></section></div>
                                        </article>
                                    </div>
                                ) : group === 'Form Publik' ? (
                                    <div className="overflow-hidden rounded-lg border border-brand-border bg-white shadow-sm">
                                        <div className="bg-black px-3 py-4 text-center text-white"><div className="text-[9px] tracking-[0.3em] text-white/70">ATTERA VISUAL</div><div className="mt-1 text-xl font-light tracking-[0.2em]">ATTERA</div></div>
                                        <div className="p-3 sm:p-4"><div className="mb-3 text-center"><p className="text-[9px] font-semibold tracking-[0.25em] text-brand-text-secondary">{previewText('public.inquiry.title', 'INQUIRY')}</p><p className="mt-1 text-base font-medium text-brand-text-primary">ATTERA VISUAL</p></div>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{inquiryFields.map(([key, label, placeholder]) => <div key={key} className="min-w-0"><p className="mb-1 truncate text-[8px] font-bold uppercase tracking-wider text-brand-text-secondary">{previewText(key, label)}</p><div className="truncate rounded border border-brand-border px-2 py-1.5 text-[10px] text-brand-text-secondary">{placeholder}</div></div>)}
                                                <div className="sm:col-span-2"><p className="mb-1 text-[8px] font-bold uppercase tracking-wider text-brand-text-secondary">{previewText('public.inquiry.notes', 'Catatan')}</p><div className="h-10 rounded border border-brand-border px-2 py-1.5 text-[10px] text-brand-text-secondary">Pesan tambahan (opsional)</div></div>
                                                <div className="sm:col-span-2"><div className="rounded bg-brand-accent px-2 py-2 text-center text-[9px] font-bold uppercase text-white">{previewText('public.inquiry.submit', 'Kirim Pesan')}</div><p className="mt-2 text-center text-[9px] text-brand-text-secondary">{previewText('public.inquiry.whatsappLink', 'Atau chat via WhatsApp')} →</p></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : group === 'Form Booking Publik' ? (
                                    <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
                                        <div className="h-20 bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-4 text-white"><p className="text-[9px] font-semibold tracking-[0.25em]">ATTERA VISUAL</p><p className="mt-2 text-lg font-bold">Form Booking</p></div>
                                        <div className="p-4 sm:p-5"><h6 className="mb-3 text-sm font-bold text-brand-text-primary">{valueFor(groupOptions[0])}</h6><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{groupOptions.slice(1, 6).map(option => <div key={option.key}><p className="mb-1 text-[9px] font-bold text-brand-text-secondary">{valueFor(option)}</p><div className="rounded-lg border border-brand-border bg-white px-3 py-2.5 text-[10px] text-slate-400">{option.key.endsWith('.date') ? 'dd/mm/yyyy' : 'Masukkan ' + valueFor(option).toLocaleLowerCase('id-ID')}</div></div>)}<div><p className="mb-1 text-[9px] font-bold text-brand-text-secondary">Package layanan</p><div className="rounded-lg border border-brand-border bg-white px-3 py-2.5 text-[10px] text-slate-500">Pilih package yang Anda inginkan</div></div></div><div className="mt-4 rounded-lg bg-black px-3 py-2.5 text-center text-[10px] font-bold text-white">{valueFor(groupOptions[6])}</div></div>
                                    </div>
                                ) : group === 'Menu' ? (
                                    <div className="overflow-hidden rounded-lg border border-brand-border bg-white shadow-sm"><div className="border-b border-brand-border px-3 py-3 text-xs font-bold text-brand-text-primary">ATTERA VISUAL</div><div className="space-y-1 p-2">{groupOptions.slice(0, 17).map(option => <div key={option.key} className={`rounded px-2.5 py-2 text-[10px] font-medium ${option.key === 'nav.dashboard' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary'}`}>{valueFor(option)}</div>)}</div></div>
                                ) : isTableGroup ? (
                                    <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border p-3"><div><p className="text-[9px] font-semibold uppercase tracking-wider text-brand-text-secondary">ATTERA VISUAL · {group}</p><p className="mt-1 text-xs font-bold text-brand-text-primary">Daftar {group.replace('Tabel ', '').toLocaleLowerCase('id-ID')}</p></div><span className="rounded-md bg-brand-accent px-2.5 py-1.5 text-[9px] font-bold text-white">+ Tambah data</span></div>
                                        <div className="flex items-center justify-between gap-2 border-b border-brand-border bg-brand-bg/40 p-2"><span className="rounded border border-brand-border bg-white px-2 py-1 text-[9px] text-brand-text-secondary">Cari data...</span><span className="text-[9px] text-brand-text-secondary">Filter · Ekspor</span></div>
                                        <div className="overflow-x-auto"><table className="w-full border-collapse text-left"><thead className="bg-brand-bg/70"><tr>{groupOptions.slice(0, 5).map(option => <th key={option.key} className="whitespace-nowrap border-b border-brand-border px-2 py-2 text-[9px] font-bold uppercase text-brand-text-secondary">{valueFor(option)}</th>)}</tr></thead><tbody>{['Maya & Dimas', 'Nadia & Fajar', 'Citra & Raka'].map((name, rowIndex) => <tr key={name}>{groupOptions.slice(0, 5).map((option, index) => <td key={option.key} className="whitespace-nowrap border-b border-brand-border px-2 py-2 text-[9px] text-brand-text-primary">{index === 0 ? String(rowIndex + 1).padStart(2, '0') : index === 1 ? name : index === 2 ? '0812 3456 7890' : index === 3 ? 'Jakarta' : 'Website'}</td>)}</tr>)}</tbody></table></div>
                                        <div className="flex items-center justify-between p-2 text-[9px] text-brand-text-secondary"><span>Menampilkan 1–3 dari 24 data</span><span>‹ &nbsp; 1 &nbsp; 2 &nbsp; 3 &nbsp; ›</span></div>
                                    </div>
                                ) : group === 'Link Publik' ? (
                                    <div className="overflow-hidden rounded-lg border border-brand-border bg-white shadow-sm"><div className="bg-black px-3 py-5 text-center text-white"><div className="text-[9px] tracking-[0.3em] text-white/70">ATTERA VISUAL</div><div className="mt-1 text-lg font-light tracking-[0.2em]">ATTERA</div></div><div className="space-y-3 p-3"><h6 className="text-sm font-semibold text-brand-text-primary">{previewText('links.admin.title', 'Kelola Link Publik')}</h6><p className="text-[10px] leading-4 text-brand-text-secondary">{previewText('links.admin.subtitle', 'Atur profil, WhatsApp, foto, dan semua tautan yang dibagikan.')}</p><div className="rounded-md border border-brand-border px-3 py-2 text-center text-[10px] font-semibold text-brand-text-primary">{previewText('links.admin.links.title', 'Tautan langsung')}</div><div className="rounded-md bg-brand-accent px-3 py-2 text-center text-[10px] font-bold text-white">{previewText('links.admin.preview', 'Lihat halaman')}</div></div></div>
                                ) : (
                                    <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-bg/40 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-brand-border bg-white px-3 py-2"><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-black text-[8px] font-bold tracking-widest text-white">V</span><span className="text-[9px] font-bold text-brand-text-primary">ATTERA VISUAL</span></div><span className="text-[9px] text-brand-text-secondary">⌕ &nbsp; ♧ &nbsp; Admin</span></div>
                                        <div className="p-3 sm:p-4">
                                            <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><p className="text-[8px] font-semibold uppercase tracking-widest text-brand-text-secondary">HALAMAN PRATINJAU · {group}</p><h6 className="mt-1 text-sm font-bold text-brand-text-primary">{valueFor(groupOptions[0])}</h6><p className="mt-1 max-w-2xl text-[9px] leading-4 text-brand-text-secondary">{valueFor(groupOptions[1] || groupOptions[0])}</p></div><span className="rounded-md bg-brand-accent px-2.5 py-1.5 text-[9px] font-bold text-white">{valueFor(groupOptions.find(option => /tombol|aksi|status/i.test(option.label)) || groupOptions[0])}</span></div>
                                            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{groupOptions.slice(0, 3).map((option, index) => <div key={option.key} className="rounded-lg border border-brand-border bg-white p-2"><p className="truncate text-[8px] font-semibold uppercase tracking-wide text-brand-text-secondary">{valueFor(option)}</p><p className="mt-1 text-xs font-bold text-brand-text-primary">{index === 0 ? '24' : index === 1 ? 'Rp 12.500.000' : '8'}</p><p className="mt-0.5 text-[8px] text-brand-text-secondary">Data pada periode ini</p></div>)}</div>
                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-border bg-white p-2"><span className="rounded border border-brand-border bg-brand-bg/50 px-2 py-1 text-[9px] text-brand-text-secondary">Cari {group.toLocaleLowerCase('id-ID')}...</span><span className="text-[9px] font-medium text-brand-text-secondary">Semua &nbsp; • &nbsp; Aktif &nbsp; • &nbsp; Filter</span></div>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{groupOptions.slice(3, 7).map((option, index) => <div key={option.key} className="rounded-lg border border-brand-border bg-white p-2.5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[8px] font-semibold uppercase tracking-wide text-brand-text-secondary">{option.label}</p><p className="mt-1 break-words text-[10px] font-bold text-brand-text-primary">{valueFor(option)}</p></div><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-700">{index % 2 === 0 ? 'Aktif' : 'Terbaru'}</span></div><div className="mt-2 h-1.5 rounded-full bg-brand-bg"><div className="h-1.5 rounded-full bg-brand-accent/70" style={{ width: `${72 - index * 8}%` }} /></div><p className="mt-2 text-[8px] text-brand-text-secondary">Contoh data · Diperbarui hari ini</p></div>)}</div>
                                            <div className="mt-3 flex items-center justify-between border-t border-brand-border pt-2 text-[8px] text-brand-text-secondary"><span>Menampilkan data contoh untuk {group.toLocaleLowerCase('id-ID')}</span><span className="rounded border border-brand-border bg-white px-2 py-1">Lihat semua →</span></div>
                                        </div>
                                    </div>
                                )}
                            </aside>
                        </div>
                    </section>
                );
            })()}

            {normalizedSearch && visibleGroups.length === 0 && (
                <p className="rounded-md border border-brand-border p-4 text-center text-sm text-brand-text-secondary">
                    Tidak ada label yang cocok dengan “{search}”.
                </p>
            )}

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 border-t border-brand-border bg-brand-surface/95 px-2 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <p role="status" className="text-xs font-medium text-brand-text-secondary">
                    {saveError || (changedKeys.length
                        ? `${changedKeys.length} perubahan belum disimpan. Simpan setiap bagian secara terpisah.`
                        : 'Tidak ada perubahan belum disimpan.')}
                </p>
            </div>
        </section>
    );
};

export default UiTextCustomizationPanel;
