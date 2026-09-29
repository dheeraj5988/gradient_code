import { ThemeToggle } from "@/components/theme-toggle";
import { SearchX } from "lucide-react";
import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center border-b border-border px-4 sm:px-6"><Logo /><ThemeToggle className="ml-auto" /></header>
      <main id="main" className="container-page flex flex-1 items-center py-16">
        <EmptyState className="w-full" icon={SearchX} title="Page not found" description="The page you're looking for doesn't exist or has moved." action={<div className="flex gap-2"><ButtonLink href="/" variant="outline" size="sm">Go home</ButtonLink><ButtonLink href="/courses" size="sm">Browse courses</ButtonLink></div>} />
      </main>
    </div>
  );
}
