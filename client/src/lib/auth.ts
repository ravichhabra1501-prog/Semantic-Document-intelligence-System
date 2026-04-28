import { resolveApiUrl } from "@/lib/api";
import { createClient } from "@/lib/client";

const defaultSupabaseProjectUrl = "https://yrqtudqlazoozqbjvwgk.supabase.co";

const supabaseProjectUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || "";

const supabase = createClient();
const emailPasswordBootstrapEndpoint = "/api/auth/email-password/bootstrap";
const localAuthStorageKey = "doc-intel-local-auth-user";

type LocalAuthUser = {
  email: string;
  id: string;
  name: string | null;
  tenantId: string | null;
};

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

export const isAuthConfigured = configErrors.length === 0;

export const authConfigError: string | null = isAuthConfigured
  ? null
  : configErrors.join(" ");

export const loginRequest = {
  endpoint: `${defaultSupabaseProjectUrl}/auth/v1/token`,
  tokenEndpoint: `${defaultSupabaseProjectUrl}/auth/v1/token`,
  provider: "",
};

export const authClientInstance = null;

function isBrowserRuntime() {
  return typeof window !== "undefined";
}

function readLocalAuthUser(): LocalAuthUser | null {
  if (!isBrowserRuntime()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(localAuthStorageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<LocalAuthUser>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.email !== "string"
    ) {
      return null;
    }

    return {
      id: parsed.id,
      email: parsed.email,
      name: typeof parsed.name === "string" ? parsed.name : null,
      tenantId:
        typeof parsed.tenantId === "string" ? parsed.tenantId : null,
    };
  } catch {
    return null;
  }
}

function writeLocalAuthUser(user: LocalAuthUser) {
  if (!isBrowserRuntime()) {
    return;
  }

  window.localStorage.setItem(localAuthStorageKey, JSON.stringify(user));
}

function clearLocalAuthUser() {
  if (!isBrowserRuntime()) {
    return;
  }

  window.localStorage.removeItem(localAuthStorageKey);
}

export function getLocalAuthUser() {
  return readLocalAuthUser();
}

export function getSignedInUser(user?: {
  id?: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
} | null) {
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

  if (user) {
    return user;
  }

  return readLocalAuthUser();
}

export async function initializeAuth() {
  return getActiveAccount();
}

export async function signInWithEmailPassword(email: string, password: string) {
  if (authConfigError) {
    throw new Error(authConfigError);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  let payload:
    | {
        createdAccount?: boolean;
        message?: string;
        requiresEmailConfirmation?: boolean;
      }
    | null = null;

  try {
    const bootstrapResponse = await fetch(
      resolveApiUrl(emailPasswordBootstrapEndpoint),
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      },
    );

    payload = (await bootstrapResponse.json().catch(() => null)) as
      | {
          createdAccount?: boolean;
          message?: string;
          requiresEmailConfirmation?: boolean;
        }
      | null;

    if (!bootstrapResponse.ok) {
      payload = null;
    }
  } catch {
    payload = null;
  } finally {
    clearTimeout(timeout);
  }

  const localUser: LocalAuthUser = {
    id: `local-${normalizedEmail}`,
    email: normalizedEmail,
    name: normalizedEmail.split("@")[0] || null,
    tenantId: null,
  };

  writeLocalAuthUser(localUser);

  return {
    createdAccount: Boolean(payload?.createdAccount),
    requiresEmailConfirmation: Boolean(
      payload?.requiresEmailConfirmation ?? false,
    ),
  };
}

export async function signOut() {
  clearLocalAuthUser();
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn("Supabase sign-out failed, local session cleared:", error);
  }
}
