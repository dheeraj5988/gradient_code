import { Blobs, Logo } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12">
      <Blobs />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center"><Logo /></div>
        <div className="rounded-3xl border border-border bg-card/80 p-8 backdrop-blur">{children}</div>
      </div>
    </div>
  );
}
