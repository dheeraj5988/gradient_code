import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

/** Live checklist under a new-password field. */
export function PasswordRules({ value, id }: { value: string; id: string }) {
  return (
    <ul id={id} className="mt-2 grid gap-1 text-xs sm:grid-cols-2" aria-label="Password requirements">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        const Icon = ok ? Check : Circle;
        return (
          <li key={r.id} className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted-foreground")}>
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{r.label}<span className="sr-only">{ok ? " — done" : " — missing"}</span></span>
          </li>
        );
      })}
    </ul>
  );
}
