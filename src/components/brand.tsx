import Link from "next/link";
import { cn } from "@/lib/utils";

/** Mark: three ascending bars — "progress by steps". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <rect x="8" y="17" width="4" height="7" rx="1" fill="#fff" opacity=".65" />
      <rect x="14" y="12" width="4" height="12" rx="1" fill="#fff" opacity=".85" />
      <rect x="20" y="7" width="4" height="17" rx="1" fill="#fff" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex shrink-0 items-center gap-2.5 text-[17px] font-bold tracking-tight text-foreground", className)} aria-label="Gradient Code home">
      <LogoMark />
      <span>Gradient Code</span>
    </Link>
  );
}
