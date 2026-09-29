"use client";
import { useActionState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { testDriveConnection } from "@/app/admin/settings/actions";
import { cn } from "@/lib/utils";

export function DriveTest({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(testDriveConnection, null);
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">Test Drive connection</h2>
        <p className="mt-1 text-sm text-muted-foreground">Checks the credentials with one small metadata request. No video is downloaded. Optionally paste a folder URL or ID to check that it is shared with the service account.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="drive-test-folder" className="sr-only">Folder URL or ID (optional)</label>
        <input id="drive-test-folder" name="folder" placeholder="Folder URL or ID (optional)" className={cn(fieldClass, "font-mono sm:flex-1")} />
        <Button disabled={pending || !configured}>{pending ? "Testing…" : "Test connection"}</Button>
      </div>
      <div aria-live="polite">
        {state?.ok ? (
          <p className="flex items-start gap-2 text-sm text-success"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />Connected{state.data.folder ? ` — “${state.data.folder.name}” is readable (${state.data.folder.items} items at the top level).` : "."}</p>
        ) : state ? (
          <p role="alert" className="flex items-start gap-2 text-sm text-danger"><XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
