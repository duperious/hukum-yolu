import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/**
 * Yapılandırma yoksa uygulama çökmez; çok oyunculu ekranlar bunun yerine
 * dürüst bir kurulum uyarısı gösterir. Yerel test modu Supabase olmadan çalışır.
 */
export const isSupabaseConfigured = Boolean(rawUrl && rawAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 5,
        },
      },
    })
  : null;

export const supabaseUrlHost = (() => {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).host;
  } catch {
    return null;
  }
})();

export const SUPABASE_SETUP_HINT =
  'Çok oyunculu mod için VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ortam değişkenleri gerekli. Yerel test modu Supabase olmadan da çalışır.';
