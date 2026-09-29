import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";

/**
 * OAuth (Google) return URL. Email verification and password reset use 6-digit codes on the site
 * (/verify-email, /reset-password) and do not pass through here.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
