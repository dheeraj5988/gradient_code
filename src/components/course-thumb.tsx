import Image from "next/image";
import { BrainCircuit, Cloud, Code2, Layers, PenTool, ShieldCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Layers> = {
  "Full Stack Development": Layers,
  "Data Science & AI": BrainCircuit,
  "Cloud & DevOps": Cloud,
  Cybersecurity: ShieldCheck,
  "UI/UX & Product Design": PenTool,
  "Digital Marketing & Business": TrendingUp,
};

/** Course image, or a branded gradient placeholder when no thumbnail is set. */
export function CourseThumb({ src, title, track, className }: { src: string | null; title: string; track: string; className?: string }) {
  const Icon = ICONS[track] ?? Code2;
  return (
    <div className={cn("relative aspect-video overflow-hidden bg-surface-2", className)}>
      {src ? (
        <Image src={src} alt={title} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center" style={{ background: "var(--brand-gradient)" }}>
          <div className="absolute inset-0 grid-bg opacity-60" />
          <Icon className="relative h-12 w-12 text-white/90" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
