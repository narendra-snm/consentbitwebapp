import { Suspense } from "react";
import type { Metadata } from "next";
import TestLoginForm from "@/components/auth/testdesign/TestLoginForm";

export const metadata: Metadata = {
  title: "Log in · ConsentBit",
};
// login
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <TestLoginForm />
    </Suspense>
  );
}
