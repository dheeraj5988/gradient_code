import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center text-center">
      <div>
        <p className="gradient-text font-display text-7xl font-bold">404</p>
        <p className="mt-2 text-muted-foreground">This page doesn&apos;t exist.</p>
        <Link href="/" className="mt-6 inline-block text-brand-pink underline">Go home</Link>
      </div>
    </div>
  );
}
