import { User } from '../types';
import supabase from '../lib/supabaseClient';
import { getProfile } from './profile';
import { dispatchWebPush, getExistingPushSubscription } from './webPush';

const TABLE = 'user_login_sessions';
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

function getSessionId(accessToken: string): string | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return typeof claims.session_id === 'string' ? claims.session_id : null;
  } catch {
    return null;
  }
}

function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  const device = /iPhone|iPad|Android|Mobile/i.test(ua) ? 'Perangkat mobile' : 'Desktop';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${device} · ${browser}`;
}

export async function registerCurrentLoginSession(user: User, options: { notify?: boolean } = {}): Promise<void> {
  const { data: authData } = await supabase.auth.getSession();
  const session = authData.session;
  if (!session || session.user.id !== user.id) return;
  const sessionId = getSessionId(session.access_token);
  if (!sessionId) return;
  const pushSubscription = await getExistingPushSubscription();

  const { data, error } = await supabase
    .from(TABLE)
    .upsert({
      session_id: sessionId,
      user_id: user.id,
      email: user.email,
      full_name: user.fullName || user.email,
      device_label: getDeviceLabel(),
    }, { onConflict: 'session_id', ignoreDuplicates: true })
    .select('session_id')
    .maybeSingle();

  if (error) throw error;
  await syncSessionPushEndpoint(sessionId, pushSubscription?.endpoint ?? null);
  if (!data || options.notify === false) return;

  try {
    const title = 'Login baru';
    const message = `${user.fullName || user.email} masuk dari ${getDeviceLabel()}.`;
    const { error: notificationError } = await supabase.from('notifications').insert({
      title,
      message,
      timestamp: new Date().toISOString(),
      is_read: false,
      icon: 'comment',
    });
    if (notificationError) throw notificationError;

    const profile = await getProfile().catch(() => null);
    if (profile?.id) {
      await dispatchWebPush({
        vendor_id: profile.id,
        user_id: user.id,
        event_type: 'login',
        title,
        message,
        url: '/#/Pengaturan',
        tag: 'attera-admin-login',
      });
    }
  } catch (error) {
    console.warn('[Login sessions] Could not create login notification:', error);
  }
}

export async function syncCurrentSessionPushEndpoint(endpoint: string | null): Promise<void> {
  const { data: authData } = await supabase.auth.getSession();
  const session = authData.session;
  if (!session) return;
  const sessionId = getSessionId(session.access_token);
  if (!sessionId) return;

  await syncSessionPushEndpoint(sessionId, endpoint);
}

async function syncSessionPushEndpoint(sessionId: string, endpoint: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_login_session_push_endpoint', {
    p_session_id: sessionId,
    p_endpoint: endpoint,
  });
  if (error) console.warn('[Login sessions] Could not sync push endpoint:', error.message, error.details, error.hint);
}

export async function heartbeatCurrentLoginSession(userId: string): Promise<void> {
  const { data: authData } = await supabase.auth.getSession();
  const session = authData.session;
  if (!session || session.user.id !== userId) return;
  const sessionId = getSessionId(session.access_token);
  if (!sessionId) return;

  const { error } = await supabase
    .from(TABLE)
    .update({ last_seen_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .is('ended_at', null);
  if (error) throw error;
}

export async function endCurrentLoginSession(userId: string): Promise<void> {
  const { data: authData } = await supabase.auth.getSession();
  const session = authData.session;
  if (!session || session.user.id !== userId) return;
  const sessionId = getSessionId(session.access_token);
  if (!sessionId) return;

  const { error } = await supabase
    .from(TABLE)
    .update({ ended_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('user_id', userId);
  if (error) throw error;
}

export function isLoginSessionActive(session: { last_seen_at: string; ended_at: string | null }): boolean {
  return !session.ended_at && Date.now() - new Date(session.last_seen_at).getTime() < ACTIVE_WINDOW_MS;
}
