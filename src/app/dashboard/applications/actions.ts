"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/admin/guard";

const MSG: Record<string, string> = {
  already_applied: "You've already applied to this internship.",
  applications_closed: "Applications for this internship are closed.",
  course_requirement_not_met: "You need the required course certificate before applying.",
  resume_url_required: "Add a link to your resume (https://…, e.g. a shared Google Drive link).",
  invalid_portfolio_url: "The portfolio link must start with https://",
  note_too_long: "Your note is too long (max 2000 characters).",
  not_found: "This internship isn't available.",
};

export async function applyInternship(internshipId: string, _prev: unknown, form: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) redirect("/login?next=/dashboard/applications");
  const { error } = await (await createClient()).rpc("apply_internship", {
    _internship_id: internshipId,
    _resume_url: String(form.get("resume_url") ?? ""),
    _portfolio_url: String(form.get("portfolio_url") ?? ""),
    _cover_note: String(form.get("cover_note") ?? ""),
  });
  if (error) {
    const key = Object.keys(MSG).find((k) => error.message.includes(k));
    return { ok: false, error: key ? MSG[key] : "Couldn't submit your application. Please try again." };
  }
  revalidatePath("/dashboard/applications");
  return { ok: true, data: null, message: "Application submitted." };
}

export async function withdrawApplication(id: string, _prev: unknown, _form: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const { error } = await (await createClient()).rpc("withdraw_application", { _application_id: id });
  if (error) return { ok: false, error: error.message.includes("cannot_withdraw") ? "This application can no longer be withdrawn." : "Couldn't withdraw the application." };
  revalidatePath("/dashboard/applications");
  return { ok: true, data: null, message: "Application withdrawn." };
}
