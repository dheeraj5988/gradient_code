"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { RESEND_SECONDS, VERIFY_CD_KEY, clearPendingEmail, getPendingEmail, markCodeSent, maskEmail, setPendingEmail } from "@/lib/auth/pending";
import { OtpInput } from "./otp-input";
import { SuccessCheck } from "./success-check";
import { useCooldown } from "./use-cooldown";

type Step = "loading" | "email" | "code" | "done";

/** Seconds mentioned in Supabase's rate-limit message ("…after 42 seconds"), if any. */
const waitFrom = (msg: string) => Number(msg.match(/(\d+)\s*seconds?/i)?.[1]) || RESEND_SECONDS;

export function VerifyEmailForm({ next, accountEmail, sendOnLoad, required }: { next: string; accountEmail: string | null; sendOnLoad: boolean; required: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const resend = useCooldown(VERIFY_CD_KEY);
  const lock = useCooldown("gc_cd_verify_lock");
  const sentOnLoad = useRef(false);

  useEffect(() => {
    const known = accountEmail || getPendingEmail();
    if (known) { setEmail(known); setPendingEmail(known); setStep("code"); } else setStep("email");
    if (known && sendOnLoad && !sentOnLoad.current) { sentOnLoad.current = true; void sendCode(known, true); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendCode(to: string, quiet = false) {
    setBusy(true); setError(null); setInfo(null);
    const { error: err } = await createClient().auth.resend({ type: "signup", email: to });
    setBusy(false);
    if (err) {
      if (err.status === 429 || /seconds|rate/i.test(err.message)) { markCodeSent(VERIFY_CD_KEY, waitFrom(err.message)); setError(`Please wait ${waitFrom(err.message)} seconds before requesting another code.`); }
      else setError("We couldn't send the code. Please try again in a moment.");
      return false;
    }
    markCodeSent(VERIFY_CD_KEY);
    if (!quiet) setInfo("A new code is on its way.");
    setCode("");
    return true;
  }

  async function verify(token: string) {
    if (busy || lock.left > 0 || token.length !== 6) return;
    setBusy(true); setError(null); setInfo(null);
    const { error: err } = await createClient().auth.verifyOtp({ email, token, type: "signup" });
    setBusy(false);
    if (err) {
      const n = wrongCount + 1;
      setWrongCount(n);
      if (n >= 5) { lock.start(30); setWrongCount(0); setError("Too many incorrect attempts. Try again in 30 seconds, or request a new code."); }
      else setError(err.status === 429 ? "Too many attempts. Please wait a moment." : "That code is incorrect or has expired. Check it, or request a new code.");
      setCode("");
      return;
    }
    clearPendingEmail();
    setStep("done");
    setTimeout(() => { router.replace(next); router.refresh(); }, 1400);
  }

  if (step === "loading") return <div className="h-40" aria-busy="true" />;

  if (step === "done") return <SuccessCheck label="Email verified" />;

  if (step === "email") {
    return (
      <form className="space-y-5" onSubmit={async (e) => { e.preventDefault(); const v = email.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setError("Enter a valid email address."); setPendingEmail(v); setEmail(v); if (await sendCode(v, true)) setStep("code"); }}>
        <Header title="Verify your email" text="Enter the email you signed up with and we'll send you a 6-digit code." />
        {required ? <Banner /> : null}
        <div><Label htmlFor="ve-email">Email</Label><Input id="ve-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button className="w-full" disabled={busy}>{busy ? "Sending…" : "Send code"}</Button>
        <p className="text-center text-sm text-muted-foreground">New here? <Link href="/signup" className="font-medium text-primary hover:underline">Create an account</Link></p>
      </form>
    );
  }

  const locked = lock.left > 0;
  return (
    <div className="space-y-5">
      <Header title="Check your email" text={<>We sent a 6-digit code to <span className="font-medium text-foreground break-all">{maskEmail(email)}</span>. It expires in 10 minutes.</>} />
      {required ? <Banner /> : null}
      <OtpInput value={code} onChange={(v) => { setCode(v); if (error) setError(null); }} onComplete={verify} disabled={busy || locked} invalid={!!error} />
      <div aria-live="polite" className="min-h-5">
        {error ? <Notice tone="error">{error}</Notice> : info ? <Notice tone="ok">{info}</Notice> : busy ? <p className="text-center text-sm text-muted-foreground">Checking…</p> : null}
      </div>
      <Button className="w-full" disabled={busy || locked || code.length !== 6} onClick={() => verify(code)}>{busy ? "Verifying…" : locked ? `Try again in ${lock.left}s` : "Verify email"}</Button>
      <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
        <span>Didn&apos;t get it?{" "}
          <button type="button" onClick={() => sendCode(email)} disabled={busy || resend.left > 0} className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-subtle-foreground disabled:no-underline">
            {resend.left > 0 ? `Resend code in ${resend.left}s` : "Resend code"}
          </button>
        </span>
        <span className="text-xs">Check your spam folder too.</span>
        <button type="button" onClick={() => { clearPendingEmail(); setCode(""); setError(null); setStep("email"); }} className="text-xs font-medium text-primary hover:underline">Use a different email</button>
      </div>
    </div>
  );
}

function Header({ title, text }: { title: string; text: React.ReactNode }) {
  return (
    <div className="text-center">
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary"><MailCheck className="h-6 w-6" aria-hidden /></span>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
function Banner() {
  return <p role="status" className="flex items-center gap-2 rounded-lg border border-warning/25 bg-warning-soft px-3 py-2 text-sm text-warning"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden />Please verify your email.</p>;
}
function Notice({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return <p role={tone === "error" ? "alert" : "status"} className={tone === "error" ? "rounded-lg bg-danger-soft px-3 py-2 text-center text-sm text-danger" : "rounded-lg bg-success-soft px-3 py-2 text-center text-sm text-success"}>{children}</p>;
}
