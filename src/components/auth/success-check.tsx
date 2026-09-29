/** Small one-shot check-mark draw animation (disabled automatically under prefers-reduced-motion). */
export function SuccessCheck({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-2 text-center">
      <svg viewBox="0 0 52 52" className="h-16 w-16 text-success" aria-hidden>
        <circle className="gc-draw" cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="3" style={{ strokeDasharray: 145, ["--gc-len" as string]: 145 }} />
        <path className="gc-draw gc-draw-delay" d="M15 27l8 8 15-16" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 40, ["--gc-len" as string]: 40 }} />
      </svg>
      <p className="text-lg font-semibold">{label}</p>
    </div>
  );
}
