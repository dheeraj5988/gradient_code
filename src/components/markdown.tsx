import type { ReactNode } from "react";

/**
 * Tiny, safe Markdown renderer for admin-authored pages: ## / ### headings, paragraphs, "- " lists,
 * **bold**, [text](url). Everything is rendered as React nodes (no raw HTML), links limited to http(s)/mailto/relative.
 */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0, i = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${key}b${i++}`}>{tok.slice(2, -2)}</strong>);
    else {
      const [, label, href] = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
      const safe = /^(https?:\/\/|mailto:|\/)/i.test(href);
      out.push(safe ? <a key={`${key}a${i++}`} href={href} className="text-primary underline underline-offset-2" {...(/^https?:/i.test(href) ? { rel: "noopener noreferrer" } : {})}>{label}</a> : label);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r/g, "").split("\n");
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) { blocks.push(<p key={blocks.length} className="leading-relaxed text-muted-foreground">{inline(para.join(" "), `p${blocks.length}`)}</p>); para = []; }
    if (list.length) { blocks.push(<ul key={blocks.length} className="list-disc space-y-1.5 pl-5 text-muted-foreground">{list.map((t, i) => <li key={i}>{inline(t, `l${blocks.length}-${i}`)}</li>)}</ul>); list = []; }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) { flush(); blocks.push(h[1].length === 2 ? <h2 key={blocks.length} className="pt-4 text-xl font-semibold text-foreground">{h[2]}</h2> : <h3 key={blocks.length} className="pt-2 text-base font-semibold text-foreground">{h[2]}</h3>); continue; }
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) { if (para.length) flush(); list.push(li[1]); continue; }
    if (list.length) flush();
    para.push(line.trim());
  }
  flush();
  return <div className="space-y-3">{blocks}</div>;
}
