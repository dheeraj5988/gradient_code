import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { isDriveConfigured, downloadSmallText } from "@/lib/google-drive/client";
import { toWebVtt } from "@/lib/google-drive/captions";
import { UUID_RE } from "@/lib/admin/util";

export const dynamic = "force-dynamic";
const deny = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Subtitle track for <track>. caption_source() returns a row only if the caller may
 * watch the lesson (same rule as lesson_content). SRT is converted to WebVTT.
 * The Drive file ID is never accepted from or sent to the client.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ captionId: string }> }) {
  const { captionId } = await context.params;
  if (IS_DEMO) return deny(404, "Not available in demo mode.");
  if (!UUID_RE.test(captionId)) return deny(400, "Invalid caption.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("caption_source", { _caption_id: captionId });
  const row = (Array.isArray(data) ? data[0] : null) as { drive_file_id: string; format: "srt" | "vtt" } | null;
  if (error || !row) return deny(403, "You don't have access to these subtitles.");
  if (!isDriveConfigured()) return deny(503, "Subtitles are temporarily unavailable.");
  const text = await downloadSmallText(row.drive_file_id, 2_000_000).catch(() => null);
  if (text == null) return deny(502, "Subtitles are temporarily unavailable.");
  return new Response(toWebVtt(text, row.format), {
    headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
  });
}
