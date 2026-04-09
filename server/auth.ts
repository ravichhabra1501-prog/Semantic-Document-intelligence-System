import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

function isPlaceholderValue(value?: string) {
  return !value || value.includes("<YOUR_") || value.includes("YOUR_SUPABASE");
}

function isLikelySupabasePublishableKey(value?: string) {
  if (!value) {
    return false;
  }

  return value.startsWith("sb_publishable_") || value.startsWith("eyJ");
}

const isSupabaseConfigured =
  !!supabaseUrl &&
  !isPlaceholderValue(supabaseAnonKey) &&
  isLikelySupabasePublishableKey(supabaseAnonKey);
const isDemoMode = !isSupabaseConfigured;

const serverSupabase =
  isSupabaseConfigured && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

function getBearerToken(authorizationHeader?: string) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

export async function requireAuthenticatedUser(req: any, res: any) {
  if (isDemoMode || !serverSupabase) {
    return {
      id: "demo-user",
      email: "demo@local",
      role: "authenticated",
    };
  }

  const accessToken = getBearerToken(req.headers.authorization);

  if (!accessToken) {
    res.status(401).send({ message: "Authentication required" });
    return null;
  }

  const { data, error } = await serverSupabase.auth.getUser(accessToken);

  if (error || !data.user) {
    res.status(401).send({ message: "Invalid or expired session" });
    return null;
  }

  return data.user;
}
