import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { IS_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// /learn is NOT listed: logged-out visitors may open free-preview lessons. Protected
// content is enforced in the database (lesson_content RPC + RLS), not here.
const PROTECTED = ["/dashboard", "/admin", "/checkout"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (IS_DEMO) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: { name: string; value: string; options?: CookieOptions }[]) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!data.user && PROTECTED.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  // Signed in but the email isn't verified yet (Google sign-ins arrive already verified).
  if (data.user && !data.user.email_confirmed_at && PROTECTED.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/verify-email";
    url.search = "";
    url.searchParams.set("reason", "required");
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
