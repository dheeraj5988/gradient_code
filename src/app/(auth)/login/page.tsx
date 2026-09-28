import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Log in" };

export default function Page() {
  return <Suspense><AuthForm mode="login" /></Suspense>;
}
