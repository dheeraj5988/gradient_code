"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly aria-label={label} value={value} onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-sm" />
      <Button type="button" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* clipboard blocked */ } }}>
        {done ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}{done ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
