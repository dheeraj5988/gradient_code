import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex h-16 items-center border-b border-border bg-background px-4 sm:px-6"><Logo /><ThemeToggle className="ml-auto" /></header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">{children}</div>
      </main>
    </div>
  );
}
