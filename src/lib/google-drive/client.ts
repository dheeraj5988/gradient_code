import "server-only";
import crypto from "node:crypto";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

/** Base URLs are overridable for corporate proxies and local integration tests. Defaults: Google. */
export const DRIVE_API_BASE = (process.env.GOOGLE_DRIVE_API_BASE || "https://www.googleapis.com").replace(/\/$/, "");
const TOKEN_URL = process.env.GOOGLE_OAUTH_TOKEN_URL || "https://oauth2.googleapis.com/token";

/** Which credential mode is configured (never exposes values). */
export function driveConfigStatus(): { mode: "service_account" | "api_key" | "none" } {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) return { mode: "service_account" };
  if (process.env.GOOGLE_DRIVE_API_KEY) return { mode: "api_key" };
  return { mode: "none" };
}

export function isDriveConfigured(): boolean {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  return Boolean((email && key) || apiKey);
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Obtains a Google OAuth2 access token using an RS256 signed Service Account JWT.
 * Tokens are cached in-memory until 5 minutes before expiration.
 */
export async function getGoogleDriveAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !privateKey) return null;

  // Handle escaped newlines in environment variable
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiresAt > now + 300) {
    return tokenCache.token;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const assertion = `${unsignedToken}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[GoogleDriveAuth] Token exchange failed:", response.status, errorText.slice(0, 200));
    return null;
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };

  return tokenCache.token;
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
}

export async function getDriveFileMetadata(fileId: string): Promise<DriveFileMetadata | null> {
  const token = await getGoogleDriveAccessToken();
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

  const url = new URL(`${DRIVE_API_BASE}/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("fields", "id,name,mimeType,size");
  url.searchParams.set("supportsAllDrives", "true");
  if (!token && apiKey) {
    url.searchParams.set("key", apiKey);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), { headers, cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  return {
    id: json.id,
    name: json.name,
    mimeType: json.mimeType || "video/mp4",
    size: json.size ? Number(json.size) : undefined,
  };
}

/** Auth for Drive API calls: bearer token (service account) or API key (public files only). */
export async function driveAuth(): Promise<{ headers: Record<string, string>; key: string | null }> {
  const token = await getGoogleDriveAccessToken();
  if (token) return { headers: { Authorization: `Bearer ${token}` }, key: null };
  return { headers: {}, key: process.env.GOOGLE_DRIVE_API_KEY || null };
}

export type DriveItem = { id: string; name: string; mimeType: string; size?: number; modifiedTime?: string };
export const FOLDER_MIME = "application/vnd.google-apps.folder";

export class DriveError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** List direct children of a folder (all pages). Throws DriveError on 403/404. */
export async function listFolder(folderId: string): Promise<DriveItem[]> {
  const { headers, key } = await driveAuth();
  const out: DriveItem[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 50; page++) {
    const url = new URL(`${DRIVE_API_BASE}/drive/v3/files`);
    url.searchParams.set("q", `'${folderId.replace(/'/g, "")}' in parents and trashed = false`);
    url.searchParams.set("fields", "nextPageToken, files(id,name,mimeType,size,modifiedTime)");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    if (key) url.searchParams.set("key", key);
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) throw new DriveError(res.status, res.status === 404 ? "Folder not found or not shared with the service account." : res.status === 403 ? "Access denied by Google Drive." : `Drive API error ${res.status}`);
    const json = (await res.json()) as { nextPageToken?: string; files: { id: string; name: string; mimeType: string; size?: string; modifiedTime?: string }[] };
    out.push(...json.files.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType, size: f.size ? Number(f.size) : undefined, modifiedTime: f.modifiedTime })));
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }
  return out;
}

/** Folder metadata (name) — used to validate the root folder before scanning. */
export async function getFolder(folderId: string): Promise<DriveItem> {
  const { headers, key } = await driveAuth();
  const url = new URL(`${DRIVE_API_BASE}/drive/v3/files/${encodeURIComponent(folderId)}`);
  url.searchParams.set("fields", "id,name,mimeType,modifiedTime");
  url.searchParams.set("supportsAllDrives", "true");
  if (key) url.searchParams.set("key", key);
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new DriveError(res.status, res.status === 404 ? "Folder not found or not shared with the service account (HTTP 404)." : `Drive API error ${res.status}`);
  const f = (await res.json()) as DriveItem;
  if (f.mimeType !== FOLDER_MIME) throw new DriveError(400, "That ID is a file, not a folder.");
  return f;
}
