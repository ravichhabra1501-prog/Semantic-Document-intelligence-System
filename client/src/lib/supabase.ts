import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isPlaceholderValue(value?: string) {
  return !value || value.includes("<YOUR_") || value.includes("YOUR_SUPABASE");
}

function isLikelySupabasePublishableKey(value?: string) {
  if (!value) {
    return false;
  }

  return value.startsWith("sb_publishable_") || value.startsWith("eyJ");
}

export const supabaseConfigError = !supabaseUrl
  ? "Missing VITE_SUPABASE_URL in .env."
  : isPlaceholderValue(supabaseAnonKey)
    ? "Replace VITE_SUPABASE_ANON_KEY in .env with the real Supabase anon or publishable key."
    : !isLikelySupabasePublishableKey(supabaseAnonKey)
      ? "VITE_SUPABASE_ANON_KEY does not look like a valid Supabase anon or publishable key."
      : null;

export const isSupabaseConfigured = !supabaseConfigError;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function getSupabaseAccessToken() {
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export async function getSupabaseAuthHeaders() {
  const accessToken = await getSupabaseAccessToken();

  return accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : {};
}
