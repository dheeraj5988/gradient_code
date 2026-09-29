import { Suspense } from "react";
import { redirect } from "next/navigation";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { safeNext } from "@/lib/auth/safe-next";
import { IS_DEMO } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Verify your email", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ next?: string; send?: string; reason?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (IS_DEMO) redirect(next);
  const user = await getUser();
  if (user?.email_confirmed_at) redirect(next); // already verified (includes Google sign-ins)
  return (
    <Suspense>
      <VerifyEmailForm next={next} accountEmail={user?.email ?? null} sendOnLoad={sp.send === "1" || (!!user && sp.reason === "required")} required={sp.reason === "required"} />
    </Suspense>
  );
}
