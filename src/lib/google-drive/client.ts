import "server-only";
import crypto from "node:crypto";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

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

  const response = await fetch("https://oauth2.googleapis.com/token", {
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
    console.error("[GoogleDriveAuth] Token exchange failed:", response.status, errorText);
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

  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("fields", "id,name,mimeType,size");
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
