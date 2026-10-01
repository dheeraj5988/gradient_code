import "server-only";
import { headers } from "next/headers";

const clean = (u: string) => u.replace(/\/$/, "");

/**
 * Public origin for payment return URLs: the host the buyer is actually on (so they come back
 * to the same domain, with their session cookie). NEXT_PUBLIC_SITE_URL is only a fallback —
 * if it points at a protected preview domain, buyers would land on a Vercel login wall.
 */
export function originFrom(host: string | null, proto: string | null): string | null {
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return null;
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${local ? proto ?? "http" : "https"}://${host}`;
}

export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const fromRequest = originFrom(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
  if (fromRequest) return fromRequest;
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  return env ? clean(env) : "http://localhost:3000";
}
