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
export const isSupabaseDemoMode = !isSupabaseConfigured;

export const DEMO_AUTH_STORAGE_KEY = "demo-auth-email";
export const DEMO_AUTH_EVENT = "demo-auth-changed";

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function dispatchDemoAuthChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(DEMO_AUTH_EVENT));
}

export function getDemoAuthEmail() {
  if (typeof window === "undefined") {
    return null;
  }

  const email = localStorage.getItem(DEMO_AUTH_STORAGE_KEY);

  return email && email.trim() ? email : null;
}

export function setDemoAuthEmail(email: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(DEMO_AUTH_STORAGE_KEY, email);
  dispatchDemoAuthChanged();
}

export function clearDemoAuthState() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
  dispatchDemoAuthChanged();
}

export async function getSupabaseAccessToken() {
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export async function getSupabaseAuthHeaders(): Promise<
  Record<string, string>
> {
  const accessToken = await getSupabaseAccessToken();

  return accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : {};
}
