"use client";
import { useRouter } from "next/navigation";
import { AdminForm, SubmitButton, TextArea, TextInput } from "@/components/admin/form";
import { applyInternship } from "@/app/dashboard/applications/actions";

export function ApplyForm({ internshipId }: { internshipId: string }) {
  const router = useRouter();
  return (
    <AdminForm action={applyInternship.bind(null, internshipId)} redirectTo={() => { router.refresh(); return "/dashboard/applications"; }}>
      <TextInput name="resume_url" label="Resume link" required type="url" placeholder="https://drive.google.com/…" hint="A link anyone with it can open (Google Drive, Dropbox, your site)." maxLength={500} />
      <TextInput name="portfolio_url" label="Portfolio / GitHub (optional)" type="url" placeholder="https://github.com/…" maxLength={500} />
      <TextArea name="cover_note" label="Why are you a good fit? (optional)" rows={5} />
      <SubmitButton pendingText="Submitting…">Submit application</SubmitButton>
    </AdminForm>
  );
}
