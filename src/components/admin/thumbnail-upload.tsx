"use client";
import Image from "next/image";
import { useActionState } from "react";
import { ImageUp } from "lucide-react";
import type { ActionResult } from "@/lib/admin/guard";
import { Button } from "@/components/ui/button";

type A = (prev: ActionResult<unknown> | null, form: FormData) => Promise<ActionResult<unknown>>;

/** Course thumbnail: current image + upload (PNG/JPG/WebP, ≤ 5 MB, 16:9 recommended). */
export function ThumbnailUpload({ action, current, title }: { action: A; current: string | null; title: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Thumbnail</h2>
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-surface">
        {current ? (
          <Image src={current} alt={`${title} thumbnail`} fill sizes="320px" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">No thumbnail yet</div>
        )}
      </div>
      <form action={formAction} className="space-y-2">
        <label htmlFor="thumb-file" className="block text-xs text-muted-foreground">PNG, JPG or WebP · up to 5 MB · 1280×720 recommended</label>
        <input id="thumb-file" name="file" type="file" required accept="image/png,image/jpeg,image/webp" className="block w-full text-sm file:mr-3 file:h-9 file:rounded-lg file:border file:border-border-strong file:bg-background file:px-3 file:text-sm file:font-medium hover:file:bg-surface" />
        <Button disabled={pending} size="sm" variant="outline"><ImageUp className="h-4 w-4" aria-hidden />{pending ? "Uploading…" : "Upload thumbnail"}</Button>
        {state && !state.ok ? <p role="alert" className="text-xs text-danger">{state.error}</p> : null}
        {state?.ok && state.message ? <p role="status" className="text-xs text-success">{state.message}</p> : null}
      </form>
    </section>
  );
}
