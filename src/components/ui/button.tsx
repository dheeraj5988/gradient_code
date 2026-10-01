import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs",
  secondary: "bg-surface-2 text-foreground hover:bg-border",
  outline: "border border-border-strong bg-background text-foreground hover:bg-surface",
  ghost: "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
  link: "text-primary hover:text-primary-hover hover:underline underline-offset-4 px-0",
} as const;
const sizes = { sm: "h-9 px-3.5 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" } as const;

export type ButtonStyle = { variant?: keyof typeof variants; size?: keyof typeof sizes };

export function buttonClass({ variant = "primary", size = "md" }: ButtonStyle = {}, extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({ variant, size, className, ...props }: ButtonStyle & ComponentProps<"button">) {
  return <button className={buttonClass({ variant, size }, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ButtonStyle & ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />;
}
