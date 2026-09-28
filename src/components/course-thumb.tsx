import Image from "next/image";
import { BarChart3, BrainCircuit, Cloud, Code2, Layers, PenTool, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Layers> = {
  "Full Stack Development": Layers,
  "Data Science & AI": BrainCircuit,
  "Data Analytics": BarChart3,
  "Cloud & DevOps": Cloud,
  Cybersecurity: ShieldCheck,
  "UI/UX & Product Design": PenTool,
};

/** Course image, or a neutral branded placeholder when no thumbnail is set. */
export function CourseThumb({ src, title, track, className, priority }: { src: string | null; title: string; track: string; className?: string; priority?: boolean }) {
  const Icon = ICONS[track] ?? Code2;
  return (
    <div className={cn("relative aspect-video overflow-hidden bg-primary-soft", className)}>
      {src ? (
        <Image src={src} alt="" fill priority={priority} sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw" className="object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center" title={track}>
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-background shadow-xs ring-1 ring-primary/10">
            <Icon className="h-7 w-7 text-primary" strokeWidth={1.75} aria-hidden />
          </span>
        </div>
      )}
    </div>
  );
}
