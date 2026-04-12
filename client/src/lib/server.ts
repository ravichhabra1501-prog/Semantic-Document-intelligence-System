import {
    createServerClient,
    parseCookieHeader,
    serializeCookieHeader,
} from "@supabase/ssr";

export function createClient(request: Request) {
  const headers = new Headers();
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseServerKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const supabase = createServerClient(supabaseUrl!, supabaseServerKey!, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "") as {
          name: string;
          value: string;
        }[];
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          headers.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, options),
          ),
        );
      },
    },
  });

  return { supabase, headers };
}
