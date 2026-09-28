"use client";
import { ErrorState } from "@/components/ui/error-state";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="container-page py-16"><ErrorState onRetry={reset} /></div>;
}
