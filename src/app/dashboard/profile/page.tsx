import { UserRound } from "lucide-react";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getMyProfile } from "@/lib/data/profile";
import { IS_DEMO } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getUser();
  const profile = await getMyProfile(user?.id ?? null);
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold sm:text-3xl">Profile</h1>
      <p className="mt-1 text-muted-foreground">Your learner profile is used for certificates and internship applications.</p>
      <div className="mt-8">
        {IS_DEMO ? (
          <EmptyState icon={UserRound} title="Profile editing is unavailable in demo mode" description="Connect Supabase to edit your profile." />
        ) : !user ? (
          <ErrorState title="Please sign in" description="Sign in to view and edit your profile." />
        ) : !profile ? (
          <ErrorState title="Profile not found" description="We couldn't find your profile record. Please contact support." />
        ) : (
          <>
            <ProfileForm initial={{ fullName: profile.full_name, phone: profile.phone ?? "", bio: profile.bio ?? "" }} email={user.email ?? ""} />
            <p className="mt-6 max-w-xl text-xs text-muted-foreground">Profile photo upload isn&apos;t available yet, so your initials are shown instead and a photo isn&apos;t counted towards profile completion.</p>
          </>
        )}
      </div>
    </div>
  );
}
