/**
 * Draft lokal untuk halaman publik (Package & Booking).
 *
 * Tujuannya supaya calon pengantin tidak kehilangan pilihan paket/add-on atau
 * isian formulir ketika halaman di-refresh. Draft hanya hidup di sessionStorage
 * tab ini dan dibersihkan begitu booking tersimpan, jadi tidak ada data yang
 * tertinggal untuk lead berikutnya.
 */

const STORAGE_PREFIX = 'vena:public-draft';

export interface PublicPackagesDraft {
    packageId: string;
    optionalPackages: { id: string; name: string; price: number; selectedDuration?: string }[];
    form: Record<string, any>;
    savedAt: number;
}

export interface PublicBookingDraft {
    form: Record<string, any>;
    savedAt: number;
}

/** Kunci draft per identitas lead agar link antar lead tidak saling menimpa. */
function draftKey(scope: 'packages' | 'booking', leadId: string | null | undefined): string {
    return `${STORAGE_PREFIX}:${scope}:${leadId || 'anon'}`;
}

export function readPackagesDraft(leadId?: string | null): PublicPackagesDraft | null {
    return readDraft<PublicPackagesDraft>(draftKey('packages', leadId));
}

export function writePackagesDraft(leadId: string | null | undefined, draft: Omit<PublicPackagesDraft, 'savedAt'>): void {
    writeDraft(draftKey('packages', leadId), { ...draft, savedAt: Date.now() });
}

export function readBookingDraft(leadId?: string | null): PublicBookingDraft | null {
    return readDraft<PublicBookingDraft>(draftKey('booking', leadId));
}

export function writeBookingDraft(leadId: string | null | undefined, draft: Omit<PublicBookingDraft, 'savedAt'>): void {
    writeDraft(draftKey('booking', leadId), { ...draft, savedAt: Date.now() });
}

export function clearPublicDrafts(leadId?: string | null): void {
    removeDraft(draftKey('packages', leadId));
    removeDraft(draftKey('booking', leadId));
}

/**
 * Kembalikan isian draft ke bentuk state formulir saat ini: hanya kolom yang
 * memang dikenal yang dipakai, sisanya diabaikan supaya draft lama tidak
 * merusak formulir setelah aplikasi berubah.
 */
export function hydrateForm<T extends Record<string, any>>(base: T, patch?: Record<string, any> | null): T {
    if (!patch) return base;
    const merged: Record<string, any> = { ...base };
    Object.keys(base).forEach(key => {
        const value = patch[key];
        if (value === undefined || value === null) return;
        const baseValue = base[key];
        if (Array.isArray(baseValue)) {
            if (Array.isArray(value)) merged[key] = value;
            return;
        }
        if (typeof baseValue === 'number') {
            if (typeof value === 'number' && Number.isFinite(value)) merged[key] = value;
            return;
        }
        if (baseValue && typeof baseValue === 'object' && value && typeof value === 'object'
            && !Array.isArray(baseValue) && !Array.isArray(value)) {
            merged[key] = { ...baseValue, ...value };
            return;
        }
        if (typeof baseValue === 'string' && typeof value === 'string') {
            merged[key] = value;
            return;
        }
        if (baseValue === undefined && (typeof value === 'number' || typeof value === 'string')) {
            merged[key] = value;
        }
    });
    return merged as T;
}

/**
 * Alihkan pilihan dari halaman Package ke formulir Booking: identitas calon
 * pengantin, tanggal/lokasi, add-on dan paket tambahan ikut terbawa.
 */
export function inheritFromPackagesDraft(draft: PublicPackagesDraft | null): Record<string, any> | null {
    if (!draft) return null;
    const patch: Record<string, any> = {};
    if (draft.packageId) patch.packageId = draft.packageId;
    ['clientName', 'email', 'phone', 'instagram', 'date', 'location', 'transportCost', 'dp', 'promoCode', 'durationSelection'].forEach(key => {
        const value = draft.form?.[key];
        if (typeof value === 'string' && value.trim() !== '') patch[key] = value;
    });
    if (Array.isArray(draft.form?.selectedAddOnIds) && draft.form.selectedAddOnIds.length > 0) {
        patch.selectedAddOnIds = draft.form.selectedAddOnIds;
    }
    const additionalIds = (draft.optionalPackages || []).map(item => item?.id).filter(Boolean);
    if (additionalIds.length > 0) {
        patch.selectedAdditionalPackageIds = additionalIds;
        patch.additionalPackageDurationSelections = Object.fromEntries(
            (draft.optionalPackages || [])
                .filter(item => item?.id && item.selectedDuration)
                .map(item => [item.id, item.selectedDuration]),
        );
    }
    return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * Draft dianggap kosong bila sama sekali tidak berbeda dari nilai awal formulir.
 * Dipakai agar draft kosong tidak menimpa pilihan yang dibawa dari halaman Package.
 */
export function isFormEmpty(form: Record<string, any> | null | undefined, defaults: Record<string, any>): boolean {
    if (!form) return true;
    return Object.keys(defaults).every(key => {
        const value = form[key];
        const base = defaults[key];
        if (Array.isArray(base)) return Array.isArray(value) && value.length === base.length;
        if (Array.isArray(value)) return value.length === 0;
        return (value ?? '') === (base ?? '');
    });
}

function readDraft<T>(key: string): T | null {    try {
        const raw = window.sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? (parsed as T) : null;
    } catch {
        return null;
    }
}

function writeDraft(key: string, value: unknown): void {
    try {
        window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Penyimpanan penuh atau mode privat: abaikan, formulir tetap bisa dipakai.
    }
}

function removeDraft(key: string): void {
    try {
        window.sessionStorage.removeItem(key);
    } catch {
        // Diabaikan dengan alasan yang sama.
    }
}
