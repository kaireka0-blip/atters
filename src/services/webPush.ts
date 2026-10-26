import supabase from '../lib/supabaseClient';
import { PushNotificationPayload, PushSubscriptionRecord } from '../types';

export const DEFAULT_VAPID_PUBLIC_KEY =
  'BJX_NFnL_PHk-4FzDZFa6x7HjcGudIIoUTr91w3lKoygm0YvJoBnAgwBrgsSSvCOvAhfz_3pyhl0eWDGPwi_ZoU';

export function getVapidPublicKey(): string {
  const envKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
  return (envKey && typeof envKey === 'string' && envKey.trim().length > 20)
    ? envKey.trim()
    : DEFAULT_VAPID_PUBLIC_KEY;
}

/**
 * Convert URL-safe base64 public key to Uint8Array for PushManager
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if Web Push Notification and Service Workers are supported
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Detect if user is on iOS / iPadOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect if the web app is running in Standalone PWA mode (added to home screen)
 * Essential requirement for iOS 16.4+ Web Push.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Detect client platform for telemetry and diagnostics
 */
export function detectDeviceType(): 'ios' | 'android' | 'safari_mac' | 'desktop' | 'other' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/macintosh|mac os x/.test(ua) && /safari/.test(ua) && !/chrome|chromium/.test(ua)) return 'safari_mac';
  return 'desktop';
}

/**
 * Get current browser notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Register the Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error('[WebPush] Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Get existing push subscription from browser if any
 */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.warn('[WebPush] Error getting subscription:', err);
    return null;
  }
}

/**
 * Subscribe user to Web Push and save subscription in Supabase with vendor_id isolation
 */
export async function subscribeToPushNotifications(
  vendorId: string,
  userId?: string
): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushSupported()) {
    return {
      success: false,
      error: 'Browser tidak mendukung Web Push Notification.',
    };
  }

  // iOS 16.4+ requires the app to be added to Home Screen (Standalone mode)
  if (isIOS() && !isStandalone()) {
    return {
      success: false,
      error:
        'Di perangkat iPhone/iPad (iOS 16.4+), notifikasi push hanya dapat diaktifkan jika aplikasi telah ditambahkan ke Layar Utama (Add to Home Screen). Silakan buka menu Bagikan di Safari dan pilih "Tambah ke Layar Utama".',
    };
  }

  try {
    // 1. Register and get Service Worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, error: 'Gagal mengaktifkan Service Worker.' };
    }

    // 2. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error:
          permission === 'denied'
            ? 'Izin notifikasi ditolak oleh browser. Buka pengaturan browser untuk mengizinkan notifikasi situs ini.'
            : 'Izin notifikasi belum diberikan.',
      };
    }

    // 3. Subscribe with VAPID Key
    const vapidKey = getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
    subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    // 4. Extract keys and endpoint
    const rawSub = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = rawSub.keys?.p256dh;
    const auth = rawSub.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return { success: false, error: 'Data kunci enkripsi Web Push tidak lengkap.' };
    }

    // 5. Store in Supabase push_subscriptions table with vendor_id and user_id
    const payload: PushSubscriptionRecord = {
      vendor_id: vendorId,
      user_id: userId || undefined,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      device_type: detectDeviceType(),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert(payload, { onConflict: 'endpoint' });

    if (dbError) {
      console.warn('[WebPush] Error saving push subscription to Supabase:', dbError);
      // Non-blocking fallback: subscription was still created on browser
    }

    return { success: true, subscription };
  } catch (err: any) {
    console.error('[WebPush] Subscription error:', err);
    return {
      success: false,
      error: err?.message || 'Gagal mendaftarkan notifikasi push.',
    };
  }
}

/**
 * Unsubscribe user from Web Push and deactivate in Supabase
 */
export async function unsubscribeFromPushNotifications(
  vendorId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscription = await getExistingPushSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      if (endpoint) {
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('endpoint', endpoint);
      }
    }
    return { success: true };
  } catch (err: any) {
    console.error('[WebPush] Unsubscribe error:', err);
    return { success: false, error: err?.message || 'Gagal menonaktifkan notifikasi push.' };
  }
}

/**
 * Trigger Supabase Edge Function to dispatch Web Push Notification
 * Isolated per vendor_id
 */
export async function dispatchWebPush(
  payload: PushNotificationPayload
): Promise<{ success: boolean; message?: string }> {
  if (!payload.vendor_id) {
    console.warn('[WebPush] dispatchWebPush cancelled: missing vendor_id.');
    return { success: false, message: 'vendor_id is required' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-web-push', {
      body: payload,
    });

    if (error) {
      console.warn('[WebPush] Edge function dispatch warning:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: data?.message || 'Push sent' };
  } catch (err: any) {
    console.warn('[WebPush] Dispatch invocation error:', err);
    return { success: false, message: err?.message };
  }
}

/**
 * Send a test notification to test the push pipeline
 */
export async function sendTestPushNotification(vendorId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // If permission is already granted, show an immediate local notification as confirmation
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg) {
          reg.showNotification('Uji Coba Push Attera Visual', {
            body: 'Notifikasi Web Push aktif dan berfungsi dengan baik!',
            icon: '/pwa-192x192.png',
            tag: 'test-push-' + Date.now(),
          });
        }
      } catch (e) {
        console.warn('[WebPush] Local notification fallback warning:', e);
      }
    }

    // Also trigger Edge Function to test remote push delivery across other devices registered to this vendor
    const res = await dispatchWebPush({
      vendor_id: vendorId,
      title: 'Uji Coba Notifikasi Attera Visual',
      message: 'Sistem Web Push Notification berhasil terhubung ke server!',
      url: '/#/settings',
      tag: 'test-push',
    });

    return { success: res.success, error: res.message };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal mengirim push uji coba.' };
  }
}
