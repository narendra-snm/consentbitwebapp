import { SignupForm } from "@/components/auth/SignupForm";
import { Suspense } from "react";



export default function SignupPage() {
  return (
    <div  style={{
        backgroundImage: "url('/images/login.png')",
      }}>
        <div className="py-5 pt-12 px-4 flex justify-center w-full">
        <img
          src="/images/ConsentBit-logo-Dark.png"
          alt="logo"
          className="h-8"
        />
      </div>
    <div

      className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center bg-cover bg-center px-6"
      
    >
      {/* Logo */}
     
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>

   
    </div>
    </div>
  );
}