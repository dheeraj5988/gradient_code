"use client";
import { AdminForm, SubmitButton, TextInput } from "@/components/admin/form";
import { claimCertificate } from "@/app/learn/[slug]/certificate/actions";

export function ClaimCertificate({ courseId, slug, defaultName }: { courseId: string; slug: string; defaultName: string }) {
  return (
    <AdminForm action={claimCertificate.bind(null, courseId, slug)} redirectTo={(d) => `/certificate/${(d as { number: string }).number}`} className="max-w-md">
      <TextInput name="name" label="Name on certificate" required defaultValue={defaultName} hint="Check the spelling — a certificate can't be edited after it is issued." maxLength={80} />
      <SubmitButton pendingText="Issuing…">Claim my certificate</SubmitButton>
    </AdminForm>
  );
}
