/** Re-mounts on every navigation, so each page gets a short entry transition (disabled for reduced motion). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="motion-safe:animate-enter">{children}</div>;
}
