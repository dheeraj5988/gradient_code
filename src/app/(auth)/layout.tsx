import type { Viewport } from "next";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/brand";

export const viewport: Viewport = { viewportFit: "cover" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gc-public flex min-h-dvh flex-col bg-surface">
      <header className="safe-inline border-b border-border bg-background pt-[env(safe-area-inset-top)]">
        <div className="flex h-16 items-center"><Logo /><ThemeToggle className="ml-auto" /></div>
      </header>
      {/* Top-aligned on phones so the on-screen keyboard doesn't push the form off screen. */}
      <main id="main" className="safe-bottom flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:py-12">
        <div className="w-full max-w-[420px] rounded-xl border border-border bg-card p-5 shadow-card sm:p-8">{children}</div>
      </main>
    </div>
  );
}
