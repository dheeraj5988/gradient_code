"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState<"loading" | "ok" | "none">("loading");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The recovery link signs the user in (via /auth/callback); without that session we cannot change the password.
  useEffect(() => { createClient().auth.getUser().then(({ data }) => setReady(data.user ? "ok" : "none")); }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password")), pw2 = String(f.get("confirm"));
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("Passwords do not match.");
    setError(null); setLoading(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return setError(error.message);
    setDone(true);
  }

  if (ready === "loading") return <p className="text-sm text-muted-foreground" role="status">Loading…</p>;
  if (ready === "none") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Link expired</h1>
        <p className="text-sm text-muted-foreground">This reset link is invalid or has expired. Request a new one.</p>
        <Link href="/forgot-password" className="inline-block text-sm font-medium text-primary hover:underline">Request a new link</Link>
      </div>
    );
  }
  if (done) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Password updated</h1>
        <p className="text-sm text-muted-foreground">Your password has been changed.</p>
        <Button className="w-full" onClick={() => { router.replace("/dashboard"); router.refresh(); }}>Go to dashboard</Button>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters.</p>
      </div>
      <div><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
      <div><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" /></div>
      {error ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
      <Button className="w-full" disabled={loading}>{loading ? "Saving…" : "Update password"}</Button>
    </form>
  );
}
