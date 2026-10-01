import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cache } from "react";
import { cookies } from "next/headers";
import { IS_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: { name: string; value: string; options?: CookieOptions }[]) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — middleware refreshes the session instead.
        }
      },
    },
  });
}

export type SessionUser = { id: string; email: string | null; user_metadata: Record<string, unknown> };

/**
 * The signed-in user, verified locally from the login cookie's JWT (getClaims + cached public key)
 * and memoised per request, so header, layout and page share one check instead of several
 * network calls. Only the fields the server uses are returned. Authorization still happens in the
 * database (RLS / has_role), which trusts the same JWT.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  if (IS_DEMO) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  return { id: c.sub, email: typeof c.email === "string" && c.email ? c.email : null, user_metadata: (c.user_metadata as Record<string, unknown> | undefined) ?? {} };
});

export async function isAdmin(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return Boolean(data);
}
