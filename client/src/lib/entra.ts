import { createClient } from "@/lib/client";

const defaultSupabaseAuthorizeUrl =
  "https://yrqtudqlazoozqbjvwgk.supabase.co/auth/v1/oauth/authorize";

const supabaseAuthorizeUrl =
  (import.meta.env.VITE_SUPABASE_AUTH_ENDPOINT as string | undefined)?.trim() ||
  defaultSupabaseAuthorizeUrl;

const supabaseOAuthProvider =
  (
    import.meta.env.VITE_SUPABASE_OAUTH_PROVIDER as string | undefined
  )?.trim() || "azure";

const supabase = createClient();

export const isEntraConfigured =
  Boolean((import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()) &&
  Boolean(
    (
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
    )?.trim(),
  );

export const entraConfigError: string | null = isEntraConfigured
  ? null
  : "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.";

export const loginRequest = {
  endpoint: supabaseAuthorizeUrl,
  provider: supabaseOAuthProvider,
};

export const entraMsalInstance = null;

export function getSignedInUser(user?: {
  id?: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}) {
  if (!user) {
    return null;
  }

  return {
    id: user.id ?? "",
    email: user.email ?? "unknown@local",
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    tenantId: null,
  };
}

export async function getEntraAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function getActiveAccount() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

export async function initializeEntraAuth() {
  return getActiveAccount();
}

export async function signInWithEntra() {
  if (entraConfigError) {
    throw new Error(entraConfigError);
  }

  const url = new URL(supabaseAuthorizeUrl);

  if (!url.searchParams.get("provider")) {
    url.searchParams.set("provider", supabaseOAuthProvider);
  }

  if (!url.searchParams.get("redirect_to")) {
    url.searchParams.set("redirect_to", window.location.origin);
  }

  window.location.assign(url.toString());
}

export async function signOutFromEntra() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
