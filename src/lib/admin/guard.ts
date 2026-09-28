import "server-only";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";

/**
 * Server-side admin authorization. Two layers:
 *  1. This check (role read from the DB via has_role RPC) — pages redirect, actions refuse.
 *  2. Supabase RLS on every admin-writable table re-checks has_role(auth.uid(),'admin').
 * Nothing here trusts client state.
 */
async function adminIdentity() {
  if (IS_DEMO) return null;
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (error || data !== true) return null;
  return { supabase, userId: user.id, email: user.email ?? "" };
}

/** For admin pages/layouts. Logged-out → login; non-admin → dashboard. */
export async function requireAdminPage() {
  if (IS_DEMO) return null; // layout renders a "Supabase required" notice
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  const admin = await adminIdentity();
  if (!admin) redirect("/dashboard?denied=admin");
  return admin;
}

export type AdminCtx = NonNullable<Awaited<ReturnType<typeof adminIdentity>>>;
export type ActionResult<T = null> = { ok: true; data: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** For server actions: returns ctx or an error result. Never throws on auth failure. */
export async function requireAdminAction(): Promise<{ ctx: AdminCtx } | { denied: ActionResult<never> }> {
  if (IS_DEMO) return { denied: { ok: false, error: "Admin actions need a configured Supabase project." } };
  const ctx = await adminIdentity();
  if (!ctx) return { denied: { ok: false, error: "You don't have permission to do that." } };
  return { ctx };
}
