"use server";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";

export type ProfileState =
  | { ok: true }
  | { ok: false; error?: string; fields?: { fullName?: string; phone?: string; bio?: string } }
  | null;

const NAME = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u;
const len = (s: string) => [...s].length;

/** Updates only full_name, phone and bio of the signed-in user's own profile row. */
export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  if (IS_DEMO) return { ok: false, error: "Profile editing is unavailable in demo mode." };
  const user = await getUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };

  const fullName = String(form.get("full_name") ?? "").replace(/\s+/g, " ").trim();
  const bioRaw = String(form.get("bio") ?? "").trim();
  const phoneRaw = String(form.get("phone") ?? "").replace(/[\s-]/g, "");
  const phone = phoneRaw.length > 10 ? phoneRaw.replace(/^(\+91|91)/, "") : phoneRaw;

  const fields: { fullName?: string; phone?: string; bio?: string } = {};
  if (len(fullName) < 2 || len(fullName) > 80) fields.fullName = "Enter your name (2–80 characters).";
  else if (!NAME.test(fullName)) fields.fullName = "Use letters, spaces, apostrophes, periods or hyphens only.";
  if (phone && !/^[6-9]\d{9}$/.test(phone)) fields.phone = "Enter a valid 10-digit mobile number.";
  if (len(bioRaw) > 500) fields.bio = "Keep your bio to 500 characters or fewer.";
  if (Object.keys(fields).length) return { ok: false, fields };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null, bio: bioRaw || null })
    .eq("id", user.id)
    .select("id");
  if (error) return { ok: false, error: "Couldn't save your profile. Please try again." };
  if (!data?.length) return { ok: false, error: "Your profile record wasn't found. Please contact support." };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
