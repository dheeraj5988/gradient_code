import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { isDriveConfigured } from "@/lib/google-drive/client";
import { streamDriveFile } from "@/lib/google-drive/stream";
import { UUID_RE } from "@/lib/admin/util";

export const dynamic = "force-dynamic";

const deny = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Authorised Drive video stream.
 * 1. The caller's Supabase session is used (cookies) — no service role.
 * 2. lesson_content() returns a row ONLY if the DB grants access
 *    (admin/staff, active enrollment, or published free-preview lesson).
 * 3. Only then is the Drive file streamed with Range support.
 * The Drive file ID is never accepted from the client.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await context.params;
  if (IS_DEMO) return deny(404, "Video streaming requires a configured database.");
  if (!UUID_RE.test(lessonId)) return deny(400, "Invalid lesson.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lesson_content", { _lesson_id: lessonId });
  const row = (Array.isArray(data) ? data[0] : null) as { video_provider?: string | null; drive_file_id?: string | null; drive_mime_type?: string | null } | null;
  if (error || !row) return deny(403, "You don't have access to this lesson.");
  if (!row.drive_file_id) return deny(404, "This lesson has no Drive video.");
  if (!isDriveConfigured()) return deny(503, "Video playback is temporarily unavailable.");

  try {
    const r = await streamDriveFile(row.drive_file_id, request.headers.get("range"), { mimeType: row.drive_mime_type });
    return new Response(r.body, { status: r.status, headers: r.headers });
  } catch (err) {
    console.error("[api/video] stream failed for lesson", lessonId, err instanceof Error ? err.message : err);
    return deny(502, "Video playback is temporarily unavailable.");
  }
}
