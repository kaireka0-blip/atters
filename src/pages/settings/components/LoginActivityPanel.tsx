import React, { useCallback, useEffect, useState } from 'react';
import { Laptop, LoaderCircle, RefreshCw, Smartphone } from 'lucide-react';
import { User } from '../../../types';
import supabase from '../../../lib/supabaseClient';
import { isLoginSessionActive } from '../../../services/loginSessions';

interface LoginSession {
  session_id: string;
  user_id: string;
  email: string;
  full_name: string;
  device_label: string;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
}

interface LoginActivityPanelProps {
  currentUser: User | null;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export const LoginActivityPanel: React.FC<LoginActivityPanelProps> = ({ currentUser }) => {
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setClock] = useState(0);

  const loadSessions = useCallback(async () => {
    setError(null);
    const { data, error: queryError } = await supabase
      .from('user_login_sessions')
      .select('session_id,user_id,email,full_name,device_label,started_at,last_seen_at,ended_at')
      .order('last_seen_at', { ascending: false })
      .limit(100);
    if (queryError) {
      setError('Daftar sesi belum dapat dimuat. Periksa migrasi dan koneksi Supabase.');
    } else {
      setSessions((data || []) as LoginSession[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser?.role !== 'Admin') {
      setLoading(false);
      return;
    }
    void loadSessions();
    const channel = supabase
      .channel('login-session-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_login_sessions' }, () => {
        void loadSessions();
      })
      .subscribe();
    const refresh = window.setInterval(() => {
      setClock((tick) => tick + 1);
      void loadSessions();
    }, 30_000);
    return () => {
      window.clearInterval(refresh);
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.role, loadSessions]);

  if (currentUser?.role !== 'Admin') return null;
  const activeCount = sessions.filter(isLoginSessionActive).length;

  return (
    <section className="bg-brand-surface rounded-2xl border border-brand-border p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-brand-text-light">Aktivitas login</h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {activeCount} aktif
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-brand-text-secondary">
            Lihat akun dan perangkat yang sedang memakai aplikasi. Status aktif diperbarui otomatis.
          </p>
        </div>
        <button type="button" onClick={() => void loadSessions()} disabled={loading} aria-label="Muat ulang aktivitas login" className="shrink-0 rounded-lg border border-brand-border p-2 text-brand-text-secondary hover:bg-brand-bg disabled:opacity-50">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && loading && sessions.length === 0 && <p className="text-sm text-brand-text-secondary">Memuat sesi login…</p>}
      {!error && !loading && sessions.length === 0 && <p className="rounded-xl bg-brand-bg p-4 text-sm text-brand-text-secondary">Belum ada aktivitas login yang tercatat. Login baru akan muncul di sini.</p>}

      {sessions.length > 0 && (
        <div className="divide-y divide-brand-border overflow-hidden rounded-xl border border-brand-border">
          {sessions.map((session) => {
            const active = isLoginSessionActive(session);
            const mobile = /mobile|iphone|ipad|android/i.test(session.device_label);
            const DeviceIcon = mobile ? Smartphone : Laptop;
            return (
              <article key={session.session_id} className="flex min-w-0 items-start gap-3 p-3 sm:p-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                  <DeviceIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="max-w-full break-words text-sm font-semibold text-brand-text-light">{session.full_name || session.email}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${active ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {active ? 'Aktif sekarang' : session.ended_at ? 'Sudah keluar' : 'Tidak aktif'}
                    </span>
                  </div>
                  <p className="mt-0.5 break-all text-xs text-brand-text-secondary">{session.email}</p>
                  <p className="mt-1 text-xs text-brand-text-secondary">{session.device_label} · terakhir aktif {formatTime(session.last_seen_at)}</p>
                  <p className="mt-0.5 text-[11px] text-brand-text-secondary">Login {formatTime(session.started_at)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default LoginActivityPanel;
