import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Set a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
