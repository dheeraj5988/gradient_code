import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { isDriveConfigured } from "@/lib/google-drive/client";
import { streamDriveFile } from "@/lib/google-drive/stream";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await context.params;

  let driveFileId: string | null = null;

  if (IS_DEMO) {
    // In demo mode without live database, allow testing with demo lessons or fallback drive IDs
    // (e.g. lessonId matching a drive ID or demo query)
    const driveMatch = lessonId.match(/^[-\w]{25,45}$/);
    if (driveMatch) {
      driveFileId = driveMatch[0];
    } else {
      // Sample public test file ID for demo verification if requested
      driveFileId = request.nextUrl.searchParams.get("drive_id");
    }
  } else {
    // Authenticate and verify lesson authorization via database RPC
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("lesson_content", { _lesson_id: lessonId });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "Forbidden: You are not enrolled in this course, or this lesson is not available for preview." },
        { status: 403 }
      );
    }

    const row = data[0] as {
      video_url?: string | null;
      drive_file_id?: string | null;
    };

    if (row.drive_file_id) {
      driveFileId = row.drive_file_id;
    } else if (row.video_url) {
      const match = row.video_url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([-\w]+)/);
      if (match) {
        driveFileId = match[1];
      }
    }
  }

  if (!driveFileId) {
    return NextResponse.json(
      { error: "NotFound: No Google Drive media asset found for this lesson." },
      { status: 404 }
    );
  }

  // Check if Google Drive streaming credentials are configured
  if (!isDriveConfigured()) {
    return NextResponse.json(
      {
        error: "ServiceUnavailable: Google Drive streaming credentials are not configured on the server.",
        requiredEnvVars: [
          "GOOGLE_SERVICE_ACCOUNT_EMAIL",
          "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
        ],
      },
      { status: 503 }
    );
  }

  try {
    const rangeHeader = request.headers.get("range");
    const streamResult = await streamDriveFile(driveFileId, rangeHeader);

    return new Response(streamResult.body, {
      status: streamResult.status,
      headers: streamResult.headers,
    });
  } catch (err: any) {
    console.error(`[DriveStreamingProxy] Stream failed for file ${driveFileId}:`, err);
    return NextResponse.json(
      { error: "InternalError: Failed to stream media from upstream provider." },
      { status: 502 }
    );
  }
}
