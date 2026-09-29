import "server-only";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";

export type Progress = { done: number; total: number; pct: number; required_pct: number; met: boolean };
export type Eligibility = {
  enabled: boolean; enrolled: boolean; eligible: boolean;
  lessons: Progress; practice: Progress;
  certificate: { number: string; issued_at: string; revoked: boolean } | null;
};

export async function getEligibility(courseId: string): Promise<Eligibility | null> {
  if (IS_DEMO) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("certificate_eligibility", { _course_id: courseId });
  return error ? null : (data as Eligibility);
}

export type MyCertificate = { id: string; certificate_number: string; issued_at: string; holder_name: string | null; course_title: string | null; revoked_at: string | null; course: { slug: string; title: string } | null };
export async function listMyCertificates(userId: string): Promise<MyCertificate[]> {
  if (IS_DEMO) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("certificates").select("id,certificate_number,issued_at,holder_name,course_title,revoked_at,course:courses(slug,title)").eq("user_id", userId).order("issued_at", { ascending: false });
  return ((data ?? []) as unknown as MyCertificate[]).map((c) => ({ ...c, course: Array.isArray(c.course) ? c.course[0] ?? null : c.course }));
}

export type Verification = { valid: boolean; revoked: boolean; not_found?: boolean; number?: string; holder_name?: string | null; course_title?: string | null; issued_at?: string };
export async function verifyCertificate(number: string): Promise<Verification | null> {
  if (IS_DEMO) return null;
  if (!/^[A-Za-z0-9-]{6,40}$/.test(number)) return { valid: false, revoked: false, not_found: true };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_certificate", { _number: number });
  return error ? null : (data as Verification);
}
