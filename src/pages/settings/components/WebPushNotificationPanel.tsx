import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  Send,
  Info,
  Share2,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { Profile, User } from '../../../types';
import {
  isPushSupported,
  isIOS,
  isStandalone,
  detectDeviceType,
  getNotificationPermission,
  getExistingPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestPushNotification,
} from '../../../services/webPush';

interface WebPushNotificationPanelProps {
  profile: Profile;
  currentUser: User | null;
}

export const WebPushNotificationPanel: React.FC<WebPushNotificationPanelProps> = ({
  profile,
  currentUser,
}) => {
  const [supported, setSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const isIOSDevice = isIOS();
  const isPwaMode = isStandalone();
  const deviceType = detectDeviceType();

  const checkStatus = useCallback(async () => {
    const isSupp = isPushSupported();
    setSupported(isSupp);
    if (!isSupp) {
      setPermission('unsupported');
      return;
    }

    const perm = getNotificationPermission();
    setPermission(perm);

    const sub = await getExistingPushSubscription();
    if (sub) {
      setIsSubscribed(true);
      setEndpoint(sub.endpoint);
    } else {
      setIsSubscribed(false);
      setEndpoint(null);
    }
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const handleSubscribe = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await subscribeToPushNotifications(profile.id, currentUser?.id);
      if (res.success && res.subscription) {
        setIsSubscribed(true);
        setEndpoint(res.subscription.endpoint);
        setPermission('granted');
        setFeedback({
          type: 'success',
          message: 'Notifikasi Web Push berhasil diaktifkan pada perangkat ini!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal mengaktifkan notifikasi push.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Terjadi kesalahan saat mengaktifkan notifikasi.',
      });
    } finally {
      setLoading(false);
      void checkStatus();
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await unsubscribeFromPushNotifications(profile.id);
      if (res.success) {
        setIsSubscribed(false);
        setEndpoint(null);
        setFeedback({
          type: 'info',
          message: 'Notifikasi Web Push telah dinonaktifkan untuk perangkat ini.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal menonaktifkan notifikasi push.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Terjadi kesalahan.',
      });
    } finally {
      setLoading(false);
      void checkStatus();
    }
  };

  const handleSendTest = async () => {
    setTestLoading(true);
    setFeedback(null);
    try {
      const res = await sendTestPushNotification(profile.id);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Notifikasi uji coba berhasil dikirim! Periksa layar / push banner perangkat Anda.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal mengirim notifikasi uji coba.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Terjadi kesalahan saat mengirim uji coba.',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const getPlatformLabel = () => {
    switch (deviceType) {
      case 'ios':
        return 'Apple iPhone / iPad (iOS)';
      case 'android':
        return 'Google Android (Chrome / Mobile)';
      case 'safari_mac':
        return 'Apple Mac (Safari macOS)';
      default:
        return 'Desktop Browser (Chrome / Edge / Firefox)';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-brand-surface rounded-2xl border border-brand-border p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-brand-text-light flex items-center gap-2">
                Web Push Notification
                {isSubscribed ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                    Belum Aktif
                  </span>
                )}
              </h3>
              <p className="text-xs sm:text-sm text-brand-text-secondary mt-1">
                Terima pembaruan real-time untuk booking, pembayaran, pengantin baru, dan jadwal bahkan saat aplikasi tidak sedang dibuka.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0">
            {isSubscribed ? (
              <>
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={testLoading}
                  className="button-secondary inline-flex items-center gap-1.5 text-xs px-3.5 py-2 font-semibold"
                >
                  <Send className={`w-3.5 h-3.5 ${testLoading ? 'animate-spin' : ''}`} />
                  {testLoading ? 'Mengirim...' : 'Kirim Uji Coba'}
                </button>
                <button
                  type="button"
                  onClick={handleUnsubscribe}
                  disabled={loading}
                  className="button-danger inline-flex items-center gap-1.5 text-xs px-3.5 py-2 font-semibold"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  {loading ? 'Memproses...' : 'Nonaktifkan'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={loading || (!supported && !isIOSDevice)}
                className="button-primary inline-flex items-center gap-2 text-xs sm:text-sm px-4 py-2.5 font-semibold shadow-md shadow-brand-accent/20"
              >
                <Bell className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
                {loading ? 'Mengaktifkan...' : 'Aktifkan Notifikasi'}
              </button>
            )}
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`mt-4 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : feedback.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            )}
            <p className="leading-relaxed">{feedback.message}</p>
          </div>
        )}
      </div>

      {/* Platform Compatibility & Setup Guide Cards */}
      <div className="bg-brand-surface rounded-2xl border border-brand-border p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-brand-text-light flex items-center gap-2">
              <Laptop className="w-4 h-4 text-brand-accent" />
              Panduan Kompatibilitas Sistem Operasi
            </h4>
            <p className="text-xs text-brand-text-secondary mt-0.5">
              Notifikasi push native mengikuti standar sistem operasi perangkat Anda.
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
            Standar Web Push RFC 8292
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* iOS Safari */}
          <div className={`p-4 rounded-xl border transition-all ${deviceType === 'ios' ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/30' : 'bg-brand-bg border-brand-border/60'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                iOS
              </div>
              <div>
                <p className="text-xs font-bold text-brand-text-light">Safari iPhone / iPad</p>
                <p className="text-[10px] text-brand-text-secondary">iOS 16.4 ke atas</p>
              </div>
            </div>
            <p className="text-[11px] text-brand-text-secondary leading-relaxed">
              Wajib ditambahkan ke <strong>Layar Utama (Add to Home Screen)</strong> lewat menu Bagikan Safari agar izin push dapat diaktifkan.
            </p>
          </div>

          {/* Android Chrome */}
          <div className={`p-4 rounded-xl border transition-all ${deviceType === 'android' ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/30' : 'bg-brand-bg border-brand-border/60'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                AND
              </div>
              <div>
                <p className="text-xs font-bold text-brand-text-light">Chrome Android</p>
                <p className="text-[10px] text-brand-text-secondary">Semua Android modern</p>
              </div>
            </div>
            <p className="text-[11px] text-brand-text-secondary leading-relaxed">
              Cukup tekan <strong>Aktifkan Notifikasi</strong> dan pilih <em>Izinkan (Allow)</em> pada pop-up izin browser Chrome Anda.
            </p>
          </div>

          {/* macOS Safari */}
          <div className={`p-4 rounded-xl border transition-all ${deviceType === 'safari_mac' ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/30' : 'bg-brand-bg border-brand-border/60'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                MAC
              </div>
              <div>
                <p className="text-xs font-bold text-brand-text-light">Safari macOS</p>
                <p className="text-[10px] text-brand-text-secondary">macOS Ventura ke atas</p>
              </div>
            </div>
            <p className="text-[11px] text-brand-text-secondary leading-relaxed">
              Mendukung notifikasi web push langsung di Notification Center Mac. Pastikan System Settings tidak mematikan notifikasi Safari.
            </p>
          </div>

          {/* Desktop Chrome / Edge */}
          <div className={`p-4 rounded-xl border transition-all ${deviceType === 'desktop' ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/30' : 'bg-brand-bg border-brand-border/60'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                PC
              </div>
              <div>
                <p className="text-xs font-bold text-brand-text-light">Chrome / Edge Desktop</p>
                <p className="text-[10px] text-brand-text-secondary">Windows &amp; Linux</p>
              </div>
            </div>
            <p className="text-[11px] text-brand-text-secondary leading-relaxed">
              Bekerja di latar belakang via Windows Action Center. Pop-up muncul di sudut layar saat ada aktivitas baru.
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Catatan Sistem:</strong> Tampilan banner notifikasi native di layar kunci dan bilah notifikasi HP secara otomatis mengikuti tampilan tema sistem operasi perangkat Anda.
          </span>
        </div>
      </div>

      {/* iOS Special Guidance Card */}
      {isIOSDevice && !isPwaMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm sm:text-base font-bold text-amber-900">
                Langkah Khusus Pengguna iPhone / iPad (iOS 16.4+)
              </h4>
              <p className="text-xs sm:text-sm text-amber-800/90 leading-relaxed">
                Kebijakan keamanan Apple Safari mewajibkan web aplikasi ditambahkan ke Layar Utama (Add to Home Screen) sebelum izin Web Push Notification dapat diberikan.
              </p>
              <ol className="list-decimal list-inside text-xs sm:text-sm text-amber-900 space-y-1 pt-1 font-medium">
                <li>Ketuk tombol <strong>Bagikan (Share)</strong> di bilah navigasi Safari bawah.</li>
                <li>Gulir ke bawah lalu ketuk <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</li>
                <li>Buka aplikasi <strong>Attera Visual</strong> dari Layar Utama Anda, lalu ketuk tombol <strong>Aktifkan Notifikasi</strong> di atas.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Diagnostics & Multi-tenant status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Device & Permission Status */}
        <div className="bg-brand-surface rounded-2xl border border-brand-border p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-brand-accent" /> Status Perangkat & Browser
          </h4>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-brand-border/60">
              <span className="text-brand-text-secondary">Perangkat Terdeteksi:</span>
              <span className="font-semibold text-brand-text-light flex items-center gap-1.5">
                {deviceType === 'desktop' ? <Laptop className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                {getPlatformLabel()}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-brand-border/60">
              <span className="text-brand-text-secondary">Dukungan Web Push:</span>
              <span className={`font-semibold ${supported ? 'text-emerald-600' : 'text-red-500'}`}>
                {supported ? 'Didukung' : 'Tidak Didukung'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-brand-border/60">
              <span className="text-brand-text-secondary">Izin Notifikasi Browser:</span>
              <span
                className={`font-semibold capitalize ${
                  permission === 'granted'
                    ? 'text-emerald-600'
                    : permission === 'denied'
                    ? 'text-red-500'
                    : 'text-amber-500'
                }`}
              >
                {permission === 'granted' ? 'Diizinkan (Granted)' : permission === 'denied' ? 'Ditolak (Blocked)' : 'Belum Ditentukan'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-brand-border/60">
              <span className="text-brand-text-secondary">Mode Aplikasi PWA:</span>
              <span className="font-semibold text-brand-text-light">
                {isPwaMode ? 'Standalone (Home Screen)' : 'Browser Tab'}
              </span>
            </div>

            {endpoint && (
              <div className="pt-1">
                <span className="text-[10px] text-brand-text-secondary block font-mono">
                  Endpoint: {endpoint.substring(0, 45)}...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Multi-Tenant Isolation & Security */}
        <div className="bg-brand-surface rounded-2xl border border-brand-border p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Isolasi Multi-Tenant & Keamanan
          </h4>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-brand-border/60">
              <span className="text-brand-text-secondary">ID Profil Vendor (Tenant):</span>
              <span className="font-mono text-xs font-semibold text-brand-text-light truncate max-w-[180px]">
                {profile.id || '-'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-brand-border/60">
              <span className="text-brand-text-secondary">Nama Vendor:</span>
              <span className="font-semibold text-brand-text-light">
                {profile.companyName || profile.fullName || 'Attera Visual'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-brand-border/60">
              <span className="text-brand-text-secondary">Pengguna Aktif:</span>
              <span className="font-semibold text-brand-text-light">
                {currentUser?.fullName || currentUser?.email || 'Admin'}
              </span>
            </div>

            <div className="bg-brand-bg rounded-xl p-3 border border-brand-border text-xs text-brand-text-secondary leading-relaxed">
              <p>
                <strong>Perlindungan Privasi:</strong> Setiap push token disimpan bersama <code>vendor_id</code>. Notifikasi vendor Anda dienkripsi secara independen dengan standar RFC 8292 (VAPID) dan tidak akan pernah diterima oleh vendor lain.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Events Integrated */}
      <div className="bg-brand-surface rounded-2xl border border-brand-border p-5 sm:p-6 space-y-4">
        <h4 className="text-xs sm:text-sm font-bold text-brand-text-light flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-accent" />
          Aktivitas yang Memicu Web Push Otomatis
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3 bg-brand-bg rounded-xl border border-brand-border/60 flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-brand-text-light">Booking Pengantin Baru</p>
              <p className="text-[11px] text-brand-text-secondary">Formulir booking publik langsung masuk.</p>
            </div>
          </div>

          <div className="p-3 bg-brand-bg rounded-xl border border-brand-border/60 flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-brand-text-light">Lead Pengantin Masuk</p>
              <p className="text-[11px] text-brand-text-secondary">Calon pengantin baru dari formulir lead.</p>
            </div>
          </div>

          <div className="p-3 bg-brand-bg rounded-xl border border-brand-border/60 flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-brand-text-light">Pembayaran &amp; DP</p>
              <p className="text-[11px] text-brand-text-secondary">Konfirmasi transaksi DP / cicilan.</p>
            </div>
          </div>

          <div className="p-3 bg-brand-bg rounded-xl border border-brand-border/60 flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-brand-text-light">Jadwal &amp; Kalender</p>
              <p className="text-[11px] text-brand-text-secondary">Reminder jadwal acara dan meeting.</p>
            </div>
          </div>

          <div className="p-3 bg-brand-bg rounded-xl border border-brand-border/60 flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-brand-text-light">Tanda Tangan Kontrak</p>
              <p className="text-[11px] text-brand-text-secondary">Pengantin menandatangani kontrak digital.</p>
            </div>
          </div>

          <div className="p-3 bg-brand-bg rounded-xl border border-brand-border/60 flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-brand-text-light">Aktivitas Tim &amp; Vendor</p>
              <p className="text-[11px] text-brand-text-secondary">Penugasan job dan pembayaran tim.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebPushNotificationPanel;
