import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { isDriveConfigured } from "@/lib/google-drive/client";
import { streamDriveFile } from "@/lib/google-drive/stream";
import { UUID_RE } from "@/lib/admin/util";

export const dynamic = "force-dynamic";
const deny = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/** Private Drive-backed course resource. RLS on course_resources decides access (published + enrolled, or admin). */
export async function GET(request: NextRequest, context: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await context.params;
  if (IS_DEMO) return deny(404, "Not available in demo mode.");
  if (!UUID_RE.test(resourceId)) return deny(400, "Invalid resource.");
  const supabase = await createClient();
  let { data: r, error } = await supabase.from("course_resources").select("title,drive_name,drive_file_id,drive_mime_type,is_downloadable").eq("id", resourceId).maybeSingle();
  if (error) {
    // drive_name arrives with migration 20261001100000; keep downloads working before it is applied.
    ({ data: r } = await supabase.from("course_resources").select("title,drive_file_id,drive_mime_type,is_downloadable").eq("id", resourceId).maybeSingle() as unknown as { data: typeof r });
  }
  if (!r) return deny(403, "You don't have access to this resource.");
  if (!r.drive_file_id) return deny(404, "This resource isn't stored on Drive.");
  if (!isDriveConfigured()) return deny(503, "File delivery is not configured on the server.");
  try {
    const res = await streamDriveFile(r.drive_file_id, request.headers.get("range"), { mimeType: r.drive_mime_type, downloadName: r.is_downloadable ? (r.drive_name || r.title) : null });
    return new Response(res.body, { status: res.status, headers: res.headers });
  } catch (err) {
    console.error("[api/resource] failed", resourceId, err instanceof Error ? err.message : err);
    return deny(502, "Couldn't load the file.");
  }
}
