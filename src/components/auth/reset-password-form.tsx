"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { RESEND_SECONDS, RESET_CD_KEY, clearPendingEmail, getPendingEmail, markCodeSent, maskEmail, setPendingEmail } from "@/lib/auth/pending";
import { OtpInput } from "./otp-input";
import { SuccessCheck } from "./success-check";
import { useCooldown } from "./use-cooldown";

type Step = "loading" | "email" | "code" | "password" | "done";

/** Password rules: ≥ 8 characters with at least one letter and one number. */
export function passwordProblem(pw: string) {
  if (pw.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Include at least one letter and one number.";
  return null;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(0);
  const resend = useCooldown(RESET_CD_KEY);
  const lock = useCooldown("gc_cd_reset_lock");

  useEffect(() => {
    const known = getPendingEmail();
    if (known) { setEmail(known); setStep("code"); } else setStep("email");
  }, []);

  async function sendCode(to: string) {
    setBusy(true); setError(null); setInfo(null);
    const { error: err } = await createClient().auth.resetPasswordForEmail(to);
    setBusy(false);
    if (err) {
      const wait = Number(err.message.match(/(\d+)\s*seconds?/i)?.[1]) || RESEND_SECONDS;
      if (err.status === 429 || /seconds/i.test(err.message)) { markCodeSent(RESET_CD_KEY, wait); setError(`Please wait ${wait} seconds before requesting another code.`); }
      else setError("We couldn't send the code. Please try again in a moment.");
      return false;
    }
    markCodeSent(RESET_CD_KEY);
    setCode("");
    return true;
  }

  async function verify(token: string) {
    if (busy || lock.left > 0 || token.length !== 6) return;
    setBusy(true); setError(null); setInfo(null);
    const { error: err } = await createClient().auth.verifyOtp({ email, token, type: "recovery" });
    setBusy(false);
    if (err) {
      const n = wrong + 1; setWrong(n);
      if (n >= 5) { lock.start(30); setWrong(0); setError("Too many incorrect attempts. Try again in 30 seconds, or request a new code."); }
      else setError("That code is incorrect or has expired. Check it, or request a new code.");
      setCode("");
      return;
    }
    setStep("password"); // a short-lived recovery session now exists
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(pw);
    if (problem) return setError(problem);
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true); setError(null);
    const { error: err } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (err) {
      if (/same/i.test(err.message)) return setError("Choose a password different from your current one.");
      if (/session/i.test(err.message)) { setStep("email"); return setError("Your reset session expired. Request a new code."); }
      return setError(err.message || "Couldn't update your password. Please try again.");
    }
    clearPendingEmail();
    setStep("done");
  }

  if (step === "loading") return <div className="h-40" aria-busy="true" />;

  if (step === "done") {
    return (
      <div className="space-y-5 text-center">
        <SuccessCheck label="Password updated" />
        <p className="text-sm text-muted-foreground">You&apos;re signed in with your new password.</p>
        <Button className="w-full" onClick={() => { router.replace("/dashboard"); router.refresh(); }}>Go to dashboard</Button>
      </div>
    );
  }

  const head = (title: string, text: React.ReactNode) => (
    <div className="text-center">
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary"><KeyRound className="h-6 w-6" aria-hidden /></span>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
    </div>
  );
  const err = error ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-center text-sm text-danger">{error}</p> : null;

  if (step === "email") {
    return (
      <form className="space-y-5" onSubmit={async (e) => { e.preventDefault(); const v = email.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setError("Enter a valid email address."); setEmail(v); setPendingEmail(v); if (await sendCode(v)) setStep("code"); }}>
        {head("Reset your password", "Enter your account email and we'll send you a 6-digit code.")}
        <div><Label htmlFor="rp-email">Email</Label><Input id="rp-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {err}
        <Button className="w-full" disabled={busy}>{busy ? "Sending…" : "Send code"}</Button>
        <p className="text-center text-sm"><Link href="/login" className="font-medium text-primary hover:underline">Back to log in</Link></p>
      </form>
    );
  }

  if (step === "password") {
    return (
      <form className="space-y-5" onSubmit={savePassword} noValidate>
        {head("Choose a new password", "Code accepted. Set a new password for your account.")}
        <div><Label htmlFor="np">New password</Label><Input id="np" type="password" autoComplete="new-password" required value={pw} onChange={(e) => { setPw(e.target.value); setError(null); }} aria-describedby="np-hint" /><p id="np-hint" className={`mt-1.5 text-xs ${pw && passwordProblem(pw) ? "text-warning" : "text-muted-foreground"}`}>At least 8 characters, with a letter and a number.</p></div>
        <div><Label htmlFor="np2">Confirm password</Label><Input id="np2" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => { setPw2(e.target.value); setError(null); }} /></div>
        {err}
        <Button className="w-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
      </form>
    );
  }

  const locked = lock.left > 0;
  return (
    <div className="space-y-5">
      {head("Enter the code", <>We sent a 6-digit code to <span className="font-medium text-foreground break-all">{maskEmail(email)}</span>. It expires in 10 minutes.</>)}
      <OtpInput value={code} onChange={(v) => { setCode(v); if (error) setError(null); }} onComplete={verify} disabled={busy || locked} invalid={!!error} />
      <div aria-live="polite" className="min-h-5">{err ?? (info ? <p className="text-center text-sm text-success">{info}</p> : busy ? <p className="text-center text-sm text-muted-foreground">Checking…</p> : null)}</div>
      <Button className="w-full" disabled={busy || locked || code.length !== 6} onClick={() => verify(code)}>{busy ? "Verifying…" : locked ? `Try again in ${lock.left}s` : "Continue"}</Button>
      <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
        <span>Didn&apos;t get it?{" "}
          <button type="button" onClick={async () => { if (await sendCode(email)) setInfo("A new code is on its way."); }} disabled={busy || resend.left > 0} className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-subtle-foreground disabled:no-underline">
            {resend.left > 0 ? `Resend code in ${resend.left}s` : "Resend code"}
          </button>
        </span>
        <button type="button" onClick={() => { clearPendingEmail(); setCode(""); setError(null); setStep("email"); }} className="text-xs font-medium text-primary hover:underline">Use a different email</button>
        <ButtonLink href="/login" variant="link" size="sm">Back to log in</ButtonLink>
      </div>
    </div>
  );
}
