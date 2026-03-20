import { SignupForm } from "@/components/auth/SignupForm";
import Link from "next/link";



export default function SignupPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-6"
      style={{
        backgroundImage: "url('/images/login.png')",
      }}
    >
      {/* Logo */}
      <div className="absolute top-12 flex justify-center w-full">
        <img
          src="/images/ConsentBit-logo-Dark.png"
          alt="logo"
          className="h-8"
        />
      </div>
      <SignupForm />

   
    </div>
  );
}