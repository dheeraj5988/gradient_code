import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Log in", robots: { index: false } };

export default function Page() {
  return <Suspense><AuthForm mode="login" /></Suspense>;
}
