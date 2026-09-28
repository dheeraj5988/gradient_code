import { Clock } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      <EmptyState className="mt-10" icon={Clock} title="Coming soon" description="We're preparing this section. In the meantime, explore our courses." action={<ButtonLink href="/courses" variant="outline" size="sm">Browse courses</ButtonLink>} />
    </div>
  );
}
