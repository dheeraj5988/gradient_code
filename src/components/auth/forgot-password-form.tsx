"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { IS_DEMO } from "@/lib/supabase/env";
import { RESET_CD_KEY, markCodeSent, setPendingEmail } from "@/lib/auth/pending";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (IS_DEMO) return;
        const email = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
        setBusy(true); setError(null);
        // Supabase's "Reset Password" template uses {{ .Token }}, so this emails a 6-digit code. The response is the same whether or not the account exists.
        const { error: err } = await createClient().auth.resetPasswordForEmail(email);
        setBusy(false);
        if (err && err.status !== 429 && !/seconds/i.test(err.message)) return setError("We couldn't send the code. Please try again in a moment.");
        setPendingEmail(email);
        if (!err) markCodeSent(RESET_CD_KEY);
        router.push("/reset-password");
      }}
    >
      <div>
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your account email and we&apos;ll send you a 6-digit code.</p>
      </div>
      <div><Label htmlFor="fp-email">Email</Label><Input id="fp-email" name="email" type="email" required autoComplete="email" /></div>
      {error ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
      <Button className="w-full" disabled={busy}>{busy ? "Sending…" : "Send code"}</Button>
      <p className="text-center text-sm"><Link href="/login" className="font-medium text-primary hover:underline">Back to log in</Link></p>
    </form>
  );
}
