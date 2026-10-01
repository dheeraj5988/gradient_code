import { AdminHeader } from "@/components/admin/table";
import { ImportWizard } from "@/components/admin/import-wizard";
import { requireAdminPage } from "@/lib/admin/guard";
import { courseOptions } from "@/lib/admin/queries";
import { driveConfigStatus } from "@/lib/google-drive/client";
import { KNOWN_DRIVE_SOURCES } from "@/lib/google-drive/known-sources";

export const metadata = { title: "Import from Google Drive" };
// Large folders: scanning + importing can take minutes (server actions run in this route).
export const maxDuration = 300;

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const ctx = (await requireAdminPage())!;
  const { course } = await searchParams;
  const courses = (await courseOptions(ctx)).filter((c) => c.status !== "archived");
  return (
    <div className="mx-auto max-w-5xl">
      <AdminHeader title="Import from Google Drive" description="Scan a Drive folder, review how it maps to modules, lessons and resources, then import everything as unpublished drafts." />
      <ImportWizard courses={courses} sources={KNOWN_DRIVE_SOURCES} defaultCourse={course} configured={driveConfigStatus().mode !== "none"} />
    </div>
  );
}
