import "server-only";
import { DRIVE_API_BASE, driveAuth } from "./client";

export interface StreamResult {
  status: number;
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
}

const RANGE_RE = /^bytes=\d*-\d*$/;

/**
 * Proxies a Drive file with HTTP Range forwarding (206 Partial Content → seeking works).
 * Upstream error bodies are never forwarded (they can contain file metadata).
 */
export async function streamDriveFile(fileId: string, rangeHeader: string | null, opts: { mimeType?: string | null; downloadName?: string | null } = {}): Promise<StreamResult> {
  const { headers: auth, key } = await driveAuth();
  const url = new URL(`${DRIVE_API_BASE}/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");
  url.searchParams.set("supportsAllDrives", "true");
  if (key) url.searchParams.set("key", key);

  const upstreamHeaders: Record<string, string> = { ...auth };
  if (rangeHeader && RANGE_RE.test(rangeHeader)) upstreamHeaders["Range"] = rangeHeader;

  const upstream = await fetch(url.toString(), { headers: upstreamHeaders, cache: "no-store" });
  const headers = new Headers();
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  if (!upstream.ok && upstream.status !== 206) {
    void upstream.body?.cancel().catch(() => {}); // never block on closing the upstream error body
    headers.set("Content-Type", "application/json");
    const status = upstream.status === 416 ? 416 : upstream.status === 404 ? 404 : 502;
    if (status === 416) { const cr = upstream.headers.get("content-range"); if (cr) headers.set("Content-Range", cr); }
    return { status, headers, body: new Blob([JSON.stringify({ error: status === 404 ? "Media not found." : status === 416 ? "Range not satisfiable." : "Upstream media error." })]).stream() };
  }

  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Type", opts.mimeType || upstream.headers.get("content-type") || "application/octet-stream");
  for (const h of ["content-length", "content-range", "last-modified", "etag"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (opts.downloadName) headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(opts.downloadName)}`);
  return { status: upstream.status, headers, body: upstream.body };
}
