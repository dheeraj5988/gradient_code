import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign up", robots: { index: false } };

export default function Page() {
  return <Suspense><AuthForm mode="signup" /></Suspense>;
}
