import Link from "next/link";
import { Logo } from "@/components/brand";

const COLS = [
  { title: "Learn", links: [["All courses", "/courses"], ["Programs", "/programs"], ["Projects", "/projects"], ["Resources", "/resources"], ["Pricing", "/pricing"]] },
  { title: "Career", links: [["Internships", "/internships"], ["Verify a certificate", "/verify"]] },
  { title: "Company", links: [["About", "/about"], ["Careers", "/careers"], ["Contact", "/contact"]] },
  { title: "Legal", links: [["Terms of use", "/terms"], ["Privacy policy", "/privacy"], ["Refund policy", "/refund"]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
        <div className="space-y-3 sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Practical courses, projects and internships for students and early-career developers.
          </p>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="mb-3 text-sm font-semibold">{c.title}</h2>
            <ul className="space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="text-sm text-muted-foreground hover:text-foreground">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-page py-5 text-xs text-muted-foreground">© {new Date().getFullYear()} Gradient Code. All rights reserved.</div>
      </div>
    </footer>
  );
}
