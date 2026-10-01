"use client";
import Link from "next/link";
import { passwordProblem } from "@/lib/auth/password";
import { PasswordRules } from "@/components/auth/password-rules";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { safeNext } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/client";
import { IS_DEMO } from "@/lib/supabase/env";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [loading, setLoading] = useState(false);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(params.get("error") === "oauth" ? { tone: "error", text: "Google sign-in did not complete. Please try again." } : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (IS_DEMO) return router.push(next);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    // New passwords only — existing accounts can still log in with an older password.
    if (mode === "signup") {
      const problem = passwordProblem(password);
      if (problem) return setMsg({ tone: "error", text: problem });
    }
    setLoading(true);
    setMsg(null);
    const supabase = createClient();
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMsg({ tone: "error", text: error.message });
      router.push(next);
      router.refresh();
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: String(f.get("name") ?? "") } } });
    if (error) { setLoading(false); return setMsg({ tone: "error", text: error.message }); }
    if (data.user && data.user.identities?.length === 0) { setLoading(false); return setMsg({ tone: "error", text: "An account with this email already exists. Log in instead." }); }
    // Supabase "Confirm email" OFF (current testing phase): signUp returns a session, so go straight in.
    if (data.session) { router.push(next); router.refresh(); return; }
    // Fallback if a session was not returned: sign in with the credentials just created.
    const signedIn = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signedIn.error) return setMsg({ tone: "ok", text: "Account created. You can now log in." });
    router.push(next);
    router.refresh();
  }

  async function google() {
    if (IS_DEMO) return router.push(next);
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? "Log in to continue learning." : "Preview any course free before you buy."}</p>
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={google}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.9 10.9 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/></svg>
        Continue with Google
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" ? (<div><Label htmlFor="name">Full name</Label><Input id="name" name="name" required autoComplete="name" /></div>) : null}
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div><div className="mb-1.5 flex items-center justify-between"><Label htmlFor="password" className="mb-0">Password</Label>{mode === "login" ? <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link> : null}</div><Input id="password" name="password" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} aria-describedby={mode === "signup" ? "pw-rules" : undefined} autoComplete={mode === "login" ? "current-password" : "new-password"} />{mode === "signup" ? <PasswordRules value={pw} id="pw-rules" /> : null}</div>
        {msg ? <p role={msg.tone === "error" ? "alert" : "status"} className={msg.tone === "error" ? "rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" : "rounded-lg bg-success-soft px-3 py-2 text-sm text-success"}>{msg.text}</p> : null}
        <Button className="w-full" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</Button>
      </form>
      {mode === "signup" ? <p className="text-xs text-muted-foreground">By creating an account you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy policy</Link>.</p> : null}
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? <>New here? <Link href="/signup" className="font-medium text-primary hover:underline">Create an account</Link></> : <>Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link></>}
      </p>
    </div>
  );
}
