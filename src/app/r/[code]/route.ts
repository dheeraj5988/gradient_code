import { NextRequest, NextResponse } from "next/server";
import { REF_COOKIE } from "@/lib/payments/order";

export const dynamic = "force-dynamic";

/** /r/CODE → remember the referral code for 30 days, then send the visitor to the site (or a relative ?to= path). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const to = req.nextUrl.searchParams.get("to") ?? "/courses";
  const dest = to.startsWith("/") && !to.startsWith("//") ? to : "/courses";
  const res = NextResponse.redirect(new URL(dest, req.nextUrl.origin), { status: 302 });
  if (/^[A-Z0-9_-]{3,20}$/.test(code)) {
    res.cookies.set(REF_COOKIE, code, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", maxAge: 60 * 60 * 24 * 30, path: "/" });
  }
  return res;
}
