import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ComingSoon } from "@/components/coming-soon";
import { Markdown } from "@/components/markdown";
import { fillPlaceholders, getSitePage, getSiteSettings } from "@/lib/data/legal";
import { IS_DEMO } from "@/lib/supabase/env";

export async function LegalPage({ slug, fallbackTitle }: { slug: string; fallbackTitle: string }) {
  if (IS_DEMO) return <ComingSoon title={fallbackTitle} description="This page is available once the site is connected to its database." />;
  const [page, settings] = await Promise.all([getSitePage(slug), getSiteSettings()]);
  if (!page) notFound();
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: page.title }]} />
      <article className="mt-4 max-w-3xl">
        <h1 className="text-3xl font-bold sm:text-4xl">{page.title}</h1>
        <p className="mt-2 text-sm text-subtle-foreground">Last updated {new Date(page.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
        {!page.reviewed ? (
          <p role="note" className="mt-4 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-soft px-3 py-2 text-sm text-warning"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />This document is being finalised. Please contact us if you have questions before purchasing.</p>
        ) : null}
        <div className="mt-6"><Markdown source={fillPlaceholders(page.body_md, settings)} /></div>
      </article>
    </div>
  );
}
