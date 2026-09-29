"use server";
import { requireAdminAction, type ActionResult } from "@/lib/admin/guard";
import { parseDriveId, str } from "@/lib/admin/util";
import { DRIVE_API_BASE, DriveError, driveAuth, driveConfigStatus, getFolder, getGoogleDriveAccessToken, listFolder } from "@/lib/google-drive/client";

export type DriveTestResult = { mode: "service_account" | "api_key"; folder?: { name: string; items: number } };

/**
 * Admin-only Drive connection test. Authenticates and makes one small metadata request (list 1 file, or list the
 * children of an optional folder). Never downloads media and never returns credentials, tokens or Google error bodies.
 */
export async function testDriveConnection(_prev: unknown, form: FormData): Promise<ActionResult<DriveTestResult>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const { mode } = driveConfigStatus();
  if (mode === "none") return { ok: false, error: "Not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY on the server." };
  const rawFolder = str(form, "folder");
  const folderId = rawFolder ? parseDriveId(rawFolder) : null;
  if (rawFolder && !folderId) return { ok: false, error: "That doesn't look like a Drive folder URL or ID." };
  try {
    if (mode === "service_account" && !(await getGoogleDriveAccessToken())) {
      return { ok: false, error: "Google rejected the service-account credentials. Check the email and private key (paste the key exactly, including the BEGIN/END lines)." };
    }
    if (folderId) {
      const f = await getFolder(folderId);
      const kids = await listFolder(folderId);
      return { ok: true, data: { mode, folder: { name: f.name, items: kids.length } }, message: "Connected" };
    }
    const { headers, key } = await driveAuth();
    const url = new URL(`${DRIVE_API_BASE}/drive/v3/files`);
    url.searchParams.set("pageSize", "1");
    url.searchParams.set("fields", "files(id)");
    url.searchParams.set("supportsAllDrives", "true");
    if (key) url.searchParams.set("key", key);
    const res = await fetch(url, { headers, cache: "no-store" });
    void res.body?.cancel().catch(() => {});
    if (!res.ok) return { ok: false, error: res.status === 401 || res.status === 403 ? "Google Drive refused the credentials (HTTP " + res.status + "). Enable the Drive API for the project and check the service account." : `Google Drive returned HTTP ${res.status}.` };
    return { ok: true, data: { mode }, message: "Connected" };
  } catch (e) {
    if (e instanceof DriveError) return { ok: false, error: e.status === 404 ? "Source inaccessible — the folder was not found or is not shared with the service account (Viewer)." : e.message };
    console.error("[drive-test] failed:", e instanceof Error ? e.message : "unknown error");
    return { ok: false, error: "Couldn't reach Google Drive." };
  }
}
