import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const serverSupabase =
  supabaseUrl && supabaseAnonKey
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
  if (!serverSupabase) {
    res.status(500).send({
      message:
        "Supabase auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the server environment.",
    });
    return null;
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
