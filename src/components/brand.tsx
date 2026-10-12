import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** Mark: isometric hexagon "G". Gradients are brand colours (logo exception); same artwork in light and dark. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const g = (n: string) => `${id}-${n}`;
  return (
    <svg viewBox="-21 50 720 720" className={cn("h-8 w-8 shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={g("body")} gradientUnits="userSpaceOnUse" x1="40" y1="520" x2="400" y2="150">
          <stop offset="0" stopColor="#00cfff" /><stop offset=".45" stopColor="#1089ff" /><stop offset="1" stopColor="#1a4dff" />
        </linearGradient>
        <linearGradient id={g("arm")} gradientUnits="userSpaceOnUse" x1="370" y1="90" x2="590" y2="260">
          <stop offset="0" stopColor="#17a2ff" /><stop offset="1" stopColor="#7a5cff" />
        </linearGradient>
        <linearGradient id={g("top")} gradientUnits="userSpaceOnUse" x1="345" y1="420" x2="640" y2="450">
          <stop offset="0" stopColor="#a72cff" /><stop offset="1" stopColor="#e03cff" />
        </linearGradient>
        <linearGradient id={g("side")} gradientUnits="userSpaceOnUse" x1="640" y1="470" x2="500" y2="690">
          <stop offset="0" stopColor="#d93bff" /><stop offset="1" stopColor="#9a22ff" />
        </linearGradient>
        <linearGradient id={g("dark")} gradientUnits="userSpaceOnUse" x1="375" y1="600" x2="500" y2="750">
          <stop offset="0" stopColor="#2a14ff" /><stop offset="1" stopColor="#3b12e8" />
        </linearGradient>
      </defs>
      <g strokeLinejoin="round" strokeWidth="22">
        <polygon points="378,70 378,208 178,330 178,470 384,596 384,750 48,544 48,276" fill={`url(#${g("body")})`} stroke={`url(#${g("body")})`} />
        <polygon points="378,70 592,205 485,272 378,208" fill={`url(#${g("arm")})`} stroke={`url(#${g("arm")})`} />
        <polygon points="354,420 470,352 628,450 500,528" fill={`url(#${g("top")})`} stroke={`url(#${g("top")})`} />
        <polygon points="500,530 630,456 630,598 500,684" fill={`url(#${g("side")})`} stroke={`url(#${g("side")})`} />
        <polygon points="384,602 500,534 500,684 384,750" fill={`url(#${g("dark")})`} stroke={`url(#${g("dark")})`} />
      </g>
    </svg>
  );
}

/** Mark + wordmark. "CODE" follows the theme foreground (black in light, white in dark); "GRADIENT" uses the brand gradient. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex shrink-0 items-center gap-2.5 text-[17px] font-extrabold uppercase leading-none tracking-tight text-foreground", className)} aria-label="Code Gradient home">
      <LogoMark />
      <span aria-hidden>
        Code <span className="brand-wordmark">Gradient</span>
      </span>
    </Link>
  );
}
