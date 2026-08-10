import { Suspense } from "react";
import type { Metadata } from "next";
import TestSignupForm from "@/components/auth/testdesign/TestSignupForm";

export const metadata: Metadata = {
  title: "Create your account · ConsentBit",
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <TestSignupForm />
    </Suspense>
  );
}
