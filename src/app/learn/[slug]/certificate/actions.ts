"use server";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/admin/guard";

export async function claimCertificate(courseId: string, slug: string, _prev: unknown, form: FormData): Promise<ActionResult<{ number: string }>> {
  const user = await getUser();
  if (!user) redirect(`/login?next=/learn/${slug}/certificate`);
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Enter your name as it should appear on the certificate.", fieldErrors: { name: "2–80 characters." } };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_certificate", { _course_id: courseId, _holder_name: name });
  if (error) return { ok: false, error: error.message.includes("email_not_verified") ? "Please verify your email before claiming a certificate." : error.message.includes("not_eligible") ? "You haven't met all requirements yet." : "Couldn't issue the certificate. Please try again." };
  return { ok: true, data: { number: String(data) }, message: "Certificate issued." };
}
