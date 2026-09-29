"use client";
/** The email address awaiting a code lives in sessionStorage (never in the URL). Storage can be blocked, so every call is guarded. */
const KEY = "gc_pending_email";
export const getPendingEmail = () => { try { return sessionStorage.getItem(KEY) ?? ""; } catch { return ""; } };
export const setPendingEmail = (email: string) => { try { sessionStorage.setItem(KEY, email); } catch { /* ignore */ } };
export const clearPendingEmail = () => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } };
export const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(name.length - 2, 5)))}@${domain}`;
};

export const VERIFY_CD_KEY = "gc_cd_verify";
export const RESET_CD_KEY = "gc_cd_reset";
export const RESEND_SECONDS = 60;
/** Record that a code was just sent so the resend button starts its cooldown. */
export const markCodeSent = (key: string, seconds = RESEND_SECONDS) => { try { sessionStorage.setItem(key, String(Date.now() + seconds * 1000)); } catch { /* ignore */ } };
