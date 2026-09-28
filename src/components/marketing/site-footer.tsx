import Link from "next/link";
import { Logo } from "@/components/brand";

const COLS = [
  { title: "Learn", links: [["All courses", "/courses"], ["Crash courses", "/courses?crash=1"], ["Internships", "/internships"], ["Pricing", "/pricing"]] },
  { title: "Company", links: [["About", "/about"], ["Careers", "/careers"], ["Contact", "/contact"], ["Verify certificate", "/verify"]] },
  { title: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"], ["Refund policy", "/refund"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Industry-led courses, real projects and internships — so you can prove what you can build.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 text-sm font-semibold">{c.title}</h4>
            <ul className="space-y-2">
              {c.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="text-sm text-muted-foreground hover:text-foreground">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Gradient Code. All rights reserved.
      </div>
    </footer>
  );
}
