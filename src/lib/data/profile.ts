import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";

export type LearnerProfile = { full_name: string; phone: string | null; bio: string | null };

/** Own profile row (RLS: `own profile read`). Null when the row doesn't exist. Throws on a read error. */
export const getMyProfile = cache(async (userId: string | null): Promise<LearnerProfile | null> => {
  if (IS_DEMO || !userId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("full_name,phone,bio").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? { full_name: data.full_name ?? "", phone: data.phone ?? null, bio: data.bio ?? null } : null;
});

/** Greeting name: saved profile name first, then sign-in metadata, then email. Never throws. */
export async function getDisplayName(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): Promise<string> {
  if (!user) return "Demo learner";
  let saved = "";
  try {
    saved = (await getMyProfile(user.id))?.full_name.trim() ?? "";
  } catch {
    /* fall back below */
  }
  return saved || (user.user_metadata?.full_name as string) || user.email || "Learner";
}
