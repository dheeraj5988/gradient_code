import { IS_DEMO } from "@/lib/supabase/env";

export function DemoBanner() {
  if (!IS_DEMO) return null;
  return (
    <div className="border-b border-warning/25 bg-warning-soft px-4 py-2 text-center text-xs text-warning">
      <strong>Demo mode:</strong> Supabase is not configured, so sample content is shown. Add your keys to <code className="font-mono">.env.local</code>.
    </div>
  );
}
