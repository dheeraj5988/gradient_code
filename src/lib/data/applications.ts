/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";

export type InternshipEligibility = {
  found: boolean; open?: boolean; deadline_passed?: boolean; requires_course?: boolean; course_title?: string | null; course_slug?: string | null;
  course_met?: boolean; applied?: boolean; application_id?: string | null; application_status?: string | null; eligible?: boolean;
};

export async function getInternshipEligibility(internshipId: string): Promise<InternshipEligibility | null> {
  if (IS_DEMO) return null;
  const { data, error } = await (await createClient()).rpc("internship_eligibility", { _internship_id: internshipId });
  return error ? null : (data as InternshipEligibility);
}

export type AppEvent = { id: string; status: string; note: string | null; created_at: string };
export type MyApplication = { id: string; status: string; created_at: string; internship: { slug: string; title: string; company: string } | null; events: AppEvent[] };

export async function listMyApplications(userId: string): Promise<MyApplication[]> {
  if (IS_DEMO) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("internship_applications").select("id,status,created_at,internship:internships(slug,title,company)").eq("user_id", userId).order("created_at", { ascending: false });
  const apps = (data ?? []) as any[];
  if (!apps.length) return [];
  const { data: ev } = await supabase.from("internship_application_events").select("id,application_id,status,note,created_at").in("application_id", apps.map((a) => a.id)).eq("internal", false).order("created_at");
  return apps.map((a) => ({ id: a.id, status: a.status, created_at: a.created_at, internship: Array.isArray(a.internship) ? a.internship[0] ?? null : a.internship, events: ((ev ?? []) as any[]).filter((e) => e.application_id === a.id) }));
}
