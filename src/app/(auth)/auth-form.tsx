"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { IS_DEMO } from "@/lib/supabase/env";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/dashboard";
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (IS_DEMO) return router.push(next);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    setLoading(true);
    setMsg(null);
    const supabase = createClient();
    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: String(f.get("name") ?? "") },
              emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            },
          });
    setLoading(false);
    if (error) return setMsg({ tone: "error", text: error.message });
    if (mode === "signup") return setMsg({ tone: "ok", text: "Check your email to confirm your account." });
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
      <div className="text-center">
        <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? "Log in to continue learning." : "Start with a free preview lesson."}</p>
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" ? (<div><Label htmlFor="name">Full name</Label><Input id="name" name="name" required autoComplete="name" /></div>) : null}
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
        {msg ? <p role="alert" className={msg.tone === "error" ? "text-sm text-destructive" : "text-sm text-success"}>{msg.text}</p> : null}
        <Button className="w-full" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? <>New here? <Link href="/signup" className="text-brand-pink underline">Create an account</Link></> : <>Already have an account? <Link href="/login" className="text-brand-pink underline">Log in</Link></>}
      </p>
      {/* TODO(antigravity): /forgot-password + /reset-password pages */}
    </div>
  );
}
