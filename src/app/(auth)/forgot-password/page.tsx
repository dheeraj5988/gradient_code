import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
