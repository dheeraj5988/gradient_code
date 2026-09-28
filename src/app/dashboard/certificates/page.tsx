export const metadata = { title: "Certificates" };

export default function CertificatesPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Certificates</h1>
      <p className="text-muted-foreground">Complete every lesson in a course to earn a verifiable certificate.</p>
      {/* TODO(antigravity): list rows from `certificates`, PDF download, "Add to LinkedIn" button, public /verify/<number> */}
    </div>
  );
}
