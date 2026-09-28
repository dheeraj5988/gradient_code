import { IS_DEMO } from "@/lib/supabase/env";

export function DemoBanner() {
  if (!IS_DEMO) return null;
  return (
    <div className="bg-warning px-4 py-1.5 text-center text-xs font-medium text-warning-foreground">
      Demo mode — Supabase is not configured, showing sample data. Add keys to <code>.env.local</code>.
    </div>
  );
}
