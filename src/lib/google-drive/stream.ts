import "server-only";
import { getGoogleDriveAccessToken } from "./client";

export interface StreamResult {
  status: number;
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
}

/**
 * Proxies a video stream from Google Drive with full HTTP Range request forwarding.
 * Supports seeking and scrubbing in native HTML5 video elements.
 */
export async function streamDriveFile(
  fileId: string,
  rangeHeader: string | null
): Promise<StreamResult> {
  const token = await getGoogleDriveAccessToken();
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");
  if (!token && apiKey) {
    url.searchParams.set("key", apiKey);
  }

  const upstreamHeaders: Record<string, string> = {};
  if (token) {
    upstreamHeaders["Authorization"] = `Bearer ${token}`;
  }
  if (rangeHeader) {
    upstreamHeaders["Range"] = rangeHeader;
  }

  const upstreamRes = await fetch(url.toString(), {
    headers: upstreamHeaders,
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Cache-Control", "private, no-cache, no-store, must-revalidate");

  const contentType = upstreamRes.headers.get("content-type") || "video/mp4";
  responseHeaders.set("Content-Type", contentType);

  const contentLength = upstreamRes.headers.get("content-length");
  if (contentLength) {
    responseHeaders.set("Content-Length", contentLength);
  }

  const contentRange = upstreamRes.headers.get("content-range");
  if (contentRange) {
    responseHeaders.set("Content-Range", contentRange);
  }

  return {
    status: upstreamRes.status,
    headers: responseHeaders,
    body: upstreamRes.body,
  };
}
