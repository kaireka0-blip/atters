import supabase from '../lib/supabaseClient';
import { Lead, LeadStatus, ContactChannel } from '../types';

const TABLE = 'leads';

export async function listLeads(options: { limit?: number, offset?: number } = {}): Promise<Lead[]> {
  const limit = Math.min(100, Math.max(1, Math.floor(options.limit ?? 100)));
  const from = Math.max(0, Math.floor(options.offset || 0));
  let query = supabase.from(TABLE).select('*').order('date', { ascending: false }).order('id', { ascending: false });
  query = query.range(from, from + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeLead);
}

export async function listLeadsPaginated(
  page = 1,
  pageSize = 10,
  filters: {
    search?: string;
    source?: string;
    city?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    activeOnly?: boolean;
    eventMonth?: { from: string; to: string };
  } = {},
): Promise<{ leads: Lead[]; total: number; hasMore: boolean }> {
  const size = [10, 20, 50].includes(pageSize) ? pageSize : 10;
  const safePage = Math.max(1, Math.floor(page) || 1);
  const from = (safePage - 1) * size;
  let query = supabase.from(TABLE).select('*', { count: 'exact' });

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`name.ilike.${term},location.ilike.${term},notes.ilike.${term}`);
  }
  if (filters.source) query = query.eq('contact_channel', filters.source);
  if (filters.city) query = query.ilike('location', filters.city);
  if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('date', filters.dateTo);
  if (filters.status === LeadStatus.CONVERTED) {
    // Keep legacy leads whose conversion is recorded in notes visible as converted.
    query = query.or(`status.eq.${LeadStatus.CONVERTED},notes.ilike.%Dikonversi%`);
  } else if (filters.status) query = query.eq('status', filters.status);
  if (filters.activeOnly) query = query.in('status', [LeadStatus.DISCUSSION, LeadStatus.FOLLOW_UP]);
  if (filters.eventMonth) {
    query = query.gte('event_date', filters.eventMonth.from).lte('event_date', filters.eventMonth.to);
  }

  const { data, error, count } = await query
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + size - 1);
  if (error) throw error;
  const leads = (data || []).map(normalizeLead);
  const total = count || 0;
  return { leads, total, hasMore: safePage * size < total };
}

export async function createLead(payload: Omit<Lead, 'id'>): Promise<Lead> {
  const { data, error } = await supabase.from(TABLE).insert([denormalizeLead(payload)]).select('*').single();
  if (error) throw error;
  return normalizeLead(data);
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabase.from(TABLE).update(denormalizeLead(patch)).eq('id', id).select('*').single();
  if (error) throw error;
  return normalizeLead(data);
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

function normalizeLeadStatus(status: unknown): LeadStatus {
  const value = typeof status === 'string' ? status.trim() : '';
  switch (value.toLowerCase().replace(/[_-]+/g, ' ')) {
    case 'discussion':
    case 'sedang diskusi':
      return LeadStatus.DISCUSSION;
    case 'follow up':
    case 'followup':
    case 'menunggu follow up':
      return LeadStatus.FOLLOW_UP;
    case 'converted':
    case 'dikonversi':
      return LeadStatus.CONVERTED;
    case 'rejected':
    case 'ditolak':
      return LeadStatus.REJECTED;
    default:
      return value as LeadStatus;
  }
}

export function normalizeLead(row: any): Lead {
  return {
    id: row.id,
    name: row.name,
    contactChannel: row.contact_channel as ContactChannel,
    location: row.location ?? '',
    status: normalizeLeadStatus(row.status),
    date: row.date,
    notes: row.notes ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    address: row.address ?? undefined,
    eventDate: row.event_date ?? undefined,
    createdAt: row.created_at || row.date,
    updatedAt: row.updated_at ?? undefined,
  };
}

function denormalizeLead(obj: Partial<Lead>): any {
  return {
    ...(obj.name !== undefined ? { name: obj.name } : {}),
    ...(obj.contactChannel !== undefined ? { contact_channel: obj.contactChannel } : {}),
    ...(obj.location !== undefined ? { location: obj.location } : {}),
    ...(obj.status !== undefined ? { status: obj.status } : {}),
    ...(obj.date !== undefined ? { date: obj.date } : {}),
    ...(obj.notes !== undefined ? { notes: obj.notes } : {}),
    ...(obj.whatsapp !== undefined ? { whatsapp: obj.whatsapp } : {}),
    ...(obj.address !== undefined ? { address: obj.address } : {}),
    ...(obj.eventDate !== undefined ? { event_date: obj.eventDate } : {}),
  };
}
