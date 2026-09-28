import Link from "next/link";

export const metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Password reset is being set up. Please contact support in the meantime.</p>
      {/* TODO(antigravity): supabase.auth.resetPasswordForEmail + /reset-password page */}
      <Link href="/login" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">Back to log in</Link>
    </div>
  );
}
