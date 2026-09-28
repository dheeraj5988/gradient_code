export const metadata = { title: "Internship applications" };

export default function ApplicationsPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Internship applications</h1>
      <p className="text-muted-foreground">Track the status of every internship you apply to.</p>
      {/* TODO(antigravity): apply form when ?apply=<slug>; table of internship_applications with status pills */}
    </div>
  );
}
