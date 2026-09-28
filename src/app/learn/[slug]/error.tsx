"use client";
import { ErrorState } from "@/components/ui/error-state";

export default function LearnError({ reset }: { error: Error; reset: () => void }) {
  return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorState title="We couldn't load this page" onRetry={reset} /></div>;
}
