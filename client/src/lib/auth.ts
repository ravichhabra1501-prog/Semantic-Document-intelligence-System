import { createClient } from "@/lib/client";

const defaultSupabaseProjectUrl = "https://yrqtudqlazoozqbjvwgk.supabase.co";

const supabaseProjectUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || "";

function buildSupabaseEndpoint(pathname: string, fallback: string) {
  if (!supabaseProjectUrl) {
    return fallback;
  }

  try {
    return new URL(pathname, supabaseProjectUrl).toString();
  } catch {
    return fallback;
  }
}

const defaultSupabaseAuthorizeUrl = buildSupabaseEndpoint(
  "/auth/v1/authorize",
  `${defaultSupabaseProjectUrl}/auth/v1/authorize`,
);
const defaultSupabaseTokenUrl = buildSupabaseEndpoint(
  "/auth/v1/token",
  `${defaultSupabaseProjectUrl}/auth/v1/token`,
);

const supabaseAuthorizeUrl =
  (import.meta.env.VITE_SUPABASE_AUTH_ENDPOINT as string | undefined)?.trim() ||
  defaultSupabaseAuthorizeUrl;
const supabaseTokenUrl =
  (
    import.meta.env.VITE_SUPABASE_TOKEN_ENDPOINT as string | undefined
  )?.trim() || defaultSupabaseTokenUrl;

const supabaseOAuthProvider =
  (
    import.meta.env.VITE_SUPABASE_OAUTH_PROVIDER as string | undefined
  )?.trim() || "";

const supabase = createClient();

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const supabasePublishableKey =
  (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
  )?.trim() || "";

const configErrors: string[] = [];

if (!supabaseProjectUrl) {
  configErrors.push("Missing VITE_SUPABASE_URL in .env.");
} else if (!isValidUrl(supabaseProjectUrl)) {
  configErrors.push("VITE_SUPABASE_URL must be a valid URL.");
}

if (!supabasePublishableKey) {
  configErrors.push("Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env.");
}

if (!supabaseOAuthProvider) {
  configErrors.push("Missing VITE_SUPABASE_OAUTH_PROVIDER in .env.");
}

if (!isValidUrl(supabaseAuthorizeUrl)) {
  configErrors.push("VITE_SUPABASE_AUTH_ENDPOINT must be a valid URL.");
}

if (!isValidUrl(supabaseTokenUrl)) {
  configErrors.push("VITE_SUPABASE_TOKEN_ENDPOINT must be a valid URL.");
}

export const isAuthConfigured = configErrors.length === 0;

export const authConfigError: string | null = isAuthConfigured
  ? null
  : configErrors.join(" ");

export const loginRequest = {
  endpoint: supabaseAuthorizeUrl,
  tokenEndpoint: supabaseTokenUrl,
  provider: supabaseOAuthProvider,
};

export const authClientInstance = null;

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

export async function getAuthHeaders(): Promise<Record<string, string>> {
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

export async function initializeAuth() {
  return getActiveAccount();
}

export async function signIn() {
  if (authConfigError) {
    throw new Error(authConfigError);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: supabaseOAuthProvider as any,
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.url) {
    throw new Error(
      "OAuth login URL was not generated. Check Supabase provider configuration.",
    );
  }

  window.location.assign(data.url);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
