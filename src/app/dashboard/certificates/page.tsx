import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";
import { listMyCertificates } from "@/lib/data/certificates";
import { IS_DEMO } from "@/lib/supabase/env";

export const metadata = { title: "Certificates" };
export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const user = IS_DEMO ? null : await getUser();
  if (!IS_DEMO && !user) redirect("/login?next=/dashboard/certificates");
  const certs = user ? await listMyCertificates(user.id) : [];
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold sm:text-3xl">Certificates</h1>
      <p className="mt-1 text-muted-foreground">Certificates you earn appear here with a credential ID and verification link.</p>
      {certs.length === 0 ? (
        <EmptyState className="mt-8" icon={Award} title="No certificates yet" description="Meet a course's completion requirements to earn a verifiable certificate." action={<ButtonLink href="/dashboard/courses" variant="outline" size="sm">Go to my courses</ButtonLink>} />
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {certs.map((c) => (
            <li key={c.id} className="min-w-0 rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3"><Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden /><div className="min-w-0"><p className="font-semibold break-words">{c.course_title ?? c.course?.title}</p><p className="mt-0.5 text-xs text-muted-foreground">Issued {new Date(c.issued_at).toLocaleDateString("en-IN")}{c.revoked_at ? " · revoked" : ""}</p><p className="mt-2 font-mono text-xs break-all">{c.certificate_number}</p></div></div>
              <div className="mt-4 flex flex-wrap gap-2"><ButtonLink size="sm" href={`/certificate/${c.certificate_number}`}>View & download</ButtonLink><ButtonLink size="sm" variant="outline" href={`/verify/${c.certificate_number}`}>Verify</ButtonLink></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
