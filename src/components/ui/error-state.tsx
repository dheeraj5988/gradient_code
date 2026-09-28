"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

export function ErrorState({ title = "Something went wrong", description = "Please try again. If the problem continues, contact support.", onRetry }: {
  title?: string; description?: string; onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-danger/20 bg-danger-soft px-6 py-12 text-center">
      <AlertTriangle className="h-6 w-6 text-danger" aria-hidden />
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>Try again</Button> : null}
    </div>
  );
}
