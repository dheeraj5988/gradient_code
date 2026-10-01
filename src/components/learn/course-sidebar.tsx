"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Bookmark, BookOpen, ListChecks, Briefcase, CheckCircle2, ChevronDown, Circle, Code2, FileText, FolderGit2, Lock, MessagesSquare, NotebookPen, PlayCircle, Radio, LayoutGrid } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

export type SidebarModule = {
  id: string;
  title: string;
  completed: number;
  total: number;
  lessons: { id: string; title: string; type: string; duration_seconds: number; is_free_preview: boolean; done: boolean }[];
};

type Props = { slug: string; modules: SidebarModule[]; enrolled: boolean; practiceCount: number; interviewCount: number };

function NavLink({ href, icon: Icon, label, active, meta }: { href: string; icon: typeof BookOpen; label: string; active: boolean; meta?: string }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm lg:min-h-9", active ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      {meta ? <span className="text-xs tabular-nums text-subtle-foreground">{meta}</span> : null}
    </Link>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-3">
      <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-subtle-foreground uppercase">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function CourseSidebar({ slug, modules, enrolled, practiceCount, interviewCount }: Props) {
  const path = usePathname();
  const base = `/learn/${slug}`;
  const is = (p: string) => path === p || path.startsWith(p + "/");
  const currentLesson = path.startsWith(`${base}/lesson/`) ? path.split("/").pop() : null;

  return (
    <nav aria-label="Course navigation" className="divide-y divide-border">
      <Group title="Course">
        <NavLink href={base} icon={LayoutGrid} label="Overview" active={path === base} />
        <div className="mt-1 space-y-1">
          {modules.map((m, i) => {
            const open = m.lessons.some((l) => l.id === currentLesson);
            return (
              <details key={m.id} open={open || undefined} className="group rounded-md">
                <summary className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 hover:bg-surface-2">
                  <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 -rotate-90 text-subtle-foreground transition-transform group-open:rotate-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium break-words text-foreground">{m.title}</span>
                    <span className="text-xs text-subtle-foreground">Module {i + 1}{enrolled ? ` · ${m.completed}/${m.total}` : ` · ${m.total} lessons`}</span>
                  </span>
                  {enrolled && m.total && m.completed === m.total ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Module complete" /> : null}
                </summary>
                <ul className="mt-0.5 mb-1 ml-4 border-l border-border pl-2">
                  {m.lessons.map((l) => {
                    const locked = !enrolled && !l.is_free_preview;
                    const current = l.id === currentLesson;
                    const Type = l.type === "text" ? FileText : l.type === "live" ? Radio : PlayCircle;
                    const State = l.done ? CheckCircle2 : locked ? Lock : Circle;
                    return (
                      <li key={l.id}>
                        <Link href={`${base}/lesson/${l.id}`} aria-current={current ? "page" : undefined} className={cn("flex min-h-11 items-start gap-2 rounded-md px-2 py-2 text-[13px] lg:min-h-0 lg:py-1.5", current ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")}>
                          <State className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", l.done ? "text-success" : "text-subtle-foreground")} aria-label={l.done ? "Completed" : locked ? "Locked" : "Not completed"} />
                          <span className="min-w-0 flex-1">
                            <span className={cn("block break-words", current && "font-medium")}>{l.title}</span>
                            <span className="flex items-center gap-1 text-[11px] text-subtle-foreground">
                              <Type className="h-3 w-3" aria-hidden />
                              {l.duration_seconds ? formatDuration(l.duration_seconds) : l.type}
                              {locked ? null : !enrolled && l.is_free_preview ? " · Preview" : null}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </Group>
      <Group title="Practice">
        <NavLink href={`${base}/practice`} icon={Code2} label="Practice questions" active={is(`${base}/practice`) && !is(`${base}/practice/saved`)} meta={practiceCount ? String(practiceCount) : undefined} />
        <NavLink href={`${base}/practice/saved`} icon={Bookmark} label="Saved questions" active={is(`${base}/practice/saved`)} />
        <NavLink href={`${base}/interview`} icon={MessagesSquare} label="Interview prep" active={is(`${base}/interview`)} meta={interviewCount ? String(interviewCount) : undefined} />
      </Group>
      <Group title="Build">
        <NavLink href={`${base}/projects`} icon={FolderGit2} label="Projects" active={is(`${base}/projects`)} />
      </Group>
      <Group title="Resources">
        <NavLink href={`${base}/problems`} icon={ListChecks} label="Coding problems" active={is(`${base}/problems`)} />
        <NavLink href={`${base}/resources`} icon={BookOpen} label="Resources" active={is(`${base}/resources`)} />
        <NavLink href={`${base}/notes`} icon={NotebookPen} label="My notes" active={is(`${base}/notes`)} />
      </Group>
      <Group title="Career">
        <NavLink href={`${base}/certificate`} icon={Award} label="Certificate" active={is(`${base}/certificate`)} />
        <NavLink href={`${base}/internship`} icon={Briefcase} label="Internship" active={is(`${base}/internship`)} />
      </Group>
    </nav>
  );
}
