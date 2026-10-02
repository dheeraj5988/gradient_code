"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { setWishlist } from "@/app/dashboard/wishlist/actions";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  courseId: string;
  slug: string;
  title: string;
  initialSaved: boolean;
  signedIn: boolean;
  variant?: "card" | "detail";
  /** Re-render the server page after a successful change (used on the saved-courses page). */
  refreshOnChange?: boolean;
};

export function WishlistButton({ courseId, slug, title, initialSaved, signedIn, variant = "card", refreshOnChange }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cls = variant === "card"
    ? "grid h-11 w-11 place-items-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-surface"
    : buttonClass({ variant: "outline" }, "w-11 px-0");
  const icon = <Heart className={cn("h-4 w-4", saved && "fill-danger text-danger")} aria-hidden />;

  if (!signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/courses/${slug}`)}`} aria-label={`Save ${title} (sign in required)`} className={cls}>
        {icon}
      </Link>
    );
  }

  function toggle() {
    if (pending) return;
    const previous = saved;
    const desired = !previous;
    setError(null);
    setSaved(desired);
    startTransition(async () => {
      const res = await setWishlist(courseId, desired);
      if (!res.ok) {
        setSaved(previous);
        setError(res.error);
        return;
      }
      setSaved(res.saved);
      if (refreshOnChange) router.refresh();
    });
  }

  return (
    <div className="relative">
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={saved} aria-label={saved ? `Remove ${title} from saved courses` : `Save ${title}`} className={cn(cls, "disabled:opacity-60")}>
        {icon}
      </button>
      {error ? <p role="alert" className="absolute top-12 right-0 z-20 w-48 rounded-md border border-border bg-card p-2 text-xs text-danger shadow-card">{error}</p> : null}
    </div>
  );
}
