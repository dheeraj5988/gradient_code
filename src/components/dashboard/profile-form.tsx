"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { saveProfile, type ProfileState } from "@/app/dashboard/profile/actions";

export function ProfileForm({ initial, email }: { initial: { fullName: string; phone: string; bio: string }; email: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, null);
  // Controlled so a failed save keeps what the learner typed (React resets uncontrolled fields after an action).
  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone);
  const [bio, setBio] = useState(initial.bio);
  const errors = state && !state.ok ? state.fields : undefined;
  const textarea = "w-full rounded-lg border border-input bg-background p-3 text-base text-foreground placeholder:text-subtle-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm";

  return (
    <form action={action} className="max-w-xl space-y-5" noValidate>
      <div>
        <Label htmlFor="pf-email">Email</Label>
        <Input id="pf-email" value={email} readOnly aria-describedby="pf-email-hint" className="bg-surface text-muted-foreground" />
        <p id="pf-email-hint" className="mt-1 text-xs text-muted-foreground">This is your sign-in email. It can&apos;t be changed here.</p>
      </div>
      <div>
        <Label htmlFor="pf-name">Full name</Label>
        <Input id="pf-name" name="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required maxLength={120} aria-invalid={!!errors?.fullName} aria-describedby={errors?.fullName ? "pf-name-err" : "pf-name-hint"} />
        {errors?.fullName ? <p id="pf-name-err" role="alert" className="mt-1 text-xs text-danger">{errors.fullName}</p> : <p id="pf-name-hint" className="mt-1 text-xs text-muted-foreground">Used on certificates you earn from now on and on internship applications. Certificates already issued keep the name they were issued with.</p>}
      </div>
      <div>
        <Label htmlFor="pf-phone">Mobile number <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input id="pf-phone" name="phone" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="10-digit mobile number" aria-invalid={!!errors?.phone} aria-describedby={errors?.phone ? "pf-phone-err" : undefined} />
        {errors?.phone ? <p id="pf-phone-err" role="alert" className="mt-1 text-xs text-danger">{errors.phone}</p> : null}
      </div>
      <div>
        <Label htmlFor="pf-bio">Short bio <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <textarea id="pf-bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} aria-invalid={!!errors?.bio} aria-describedby={errors?.bio ? "pf-bio-err" : "pf-bio-count"} className={textarea} />
        <p id="pf-bio-count" className="mt-1 text-right text-xs text-muted-foreground tabular-nums">{[...bio].length}/500</p>
        {errors?.bio ? <p id="pf-bio-err" role="alert" className="mt-1 text-xs text-danger">{errors.bio}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
        {state?.ok ? <p role="status" className="text-sm text-success">Profile saved.</p> : null}
        {state && !state.ok && state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
      </div>
    </form>
  );
}
