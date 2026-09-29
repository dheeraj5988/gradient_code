"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const LEN = 6;

/**
 * Six-box one-time-code input. Controlled by a digits-only string (no gaps).
 * Handles typing, backspace, arrow keys, paste, and mobile one-time-code autofill (which delivers all 6 digits at once).
 */
export function OtpInput({ value, onChange, onComplete, disabled, invalid, label = "Verification code" }: { value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; disabled?: boolean; invalid?: boolean; label?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  const focus = (i: number) => refs.current[Math.max(0, Math.min(LEN - 1, i))]?.focus();
  const commit = (next: string, focusAt: number) => {
    const v = next.replace(/\D/g, "").slice(0, LEN);
    onChange(v);
    focus(focusAt);
    if (v.length === LEN) onComplete?.(v);
  };
  return (
    <div role="group" aria-label={label} className="flex justify-center gap-2 sm:gap-2.5">
      {Array.from({ length: LEN }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={value[i] ?? ""}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`${label}, digit ${i + 1} of ${LEN}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onFocus={(e) => e.currentTarget.select()}
          onClick={() => { if (i > value.length) focus(value.length); }}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "");
            if (!d) { commit(value.slice(0, i) + value.slice(i + 1), i); return; }
            commit(value.slice(0, i) + d + value.slice(i + d.length), i + d.length);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) { e.preventDefault(); commit(value.slice(0, i - 1), i - 1); }
            else if (e.key === "ArrowLeft") { e.preventDefault(); focus(i - 1); }
            else if (e.key === "ArrowRight") { e.preventDefault(); focus(Math.min(i + 1, value.length)); }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
            if (d) commit(d, d.length);
          }}
          className={cn(
            "h-12 w-10 min-w-0 rounded-lg border bg-background text-center text-xl font-semibold tabular-nums text-foreground transition-colors focus:outline-none focus:ring-2 sm:h-14 sm:w-12",
            invalid ? "border-danger focus:border-danger focus:ring-danger/20" : "border-input focus:border-primary focus:ring-primary/20",
            disabled && "opacity-60",
          )}
        />
      ))}
    </div>
  );
}
