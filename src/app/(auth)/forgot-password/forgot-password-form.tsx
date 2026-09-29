"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { IS_DEMO } from "@/lib/supabase/env";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setError(null);
    if (IS_DEMO) return setSent(true);
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/reset-password` });
    setLoading(false);
    // Same response whether or not the account exists (no account enumeration). Only surface rate-limit/service errors.
    if (error && (error.status === 429 || /rate limit|too many/i.test(error.message))) return setError("Too many requests. Please wait a minute and try again.");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-muted-foreground">If an account exists for that address, we have sent a link to reset your password.</p>
        <Link href="/login" className="inline-block text-sm font-medium text-primary hover:underline">Back to log in</Link>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your email and we will send you a reset link.</p>
      </div>
      <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
      {error ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
      <Button className="w-full" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
      <Link href="/login" className="inline-block text-sm font-medium text-primary hover:underline">Back to log in</Link>
    </form>
  );
}
