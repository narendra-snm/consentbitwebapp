

"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";         
import { requestVerificationCode, verifyVerificationCode } from "@/lib/client-api";
import OtpInput from "./OtpInput";




export function SignupForm() {   

  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (step === 1) {
        await requestVerificationCode({ name, email, purpose: 'signup' });
        setStep(2);
      } else {
        await verifyVerificationCode({ email, purpose: 'signup', code });
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (step === 1 ? 'Failed to send code' : 'Signup failed'));
    } finally {
      setLoading(false);
    }
  }

    
    return (

      <form onSubmit={handleSubmit} className="space-y-4 w-full">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {/* Login Section */}
      <div className="flex flex-col items-center w-full max-w-[463px] mx-auto">

        {/* Title */}
        <h1 className="text-[40px] font-normal text-[#2C3E8F] mb-6">
            Sign Up
        </h1>
        {/* Email Input */}
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={loading || step === 2}
          className="w-full border text-lg mb-10 border-gray-300 rounded-[9px] px-4 py-4 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#262E84] placeholder:text-[#262E84]"
        />

        {/* Email Input */}
        <input
          type="email"
          placeholder="Email ID"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading || step === 2}
          className="w-full border mb-10 text-lg border-gray-300 rounded-[9px] px-4 py-4 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#262E84] placeholder:text-[#262E84]"
        />
    
        {/* Helper Text */}
        {/* <p className="text-sm text-[#262E84] text-center mt-5 mb-10 ">
          *Please use the exact mail as the webflow native app/iframe native app
        </p> */}
        {step === 2 && (
          <div className="mb-10">
            <OtpInput value={code} onChange={setCode} length={6} disabled={loading} />
          </div>
        )}
        {/* Button */}
        <button className="w-full mb-5 bg-[#2C3E8F] hover:bg-[#24347a] text-white py-6 rounded-md transition"
        disabled={loading}>
        {loading ? (step === 1 ? 'Sending code…' : 'Verifying…') : (step === 1 ? 'Send code' : 'Verify & Sign Up')}
        </button>

        {/* Footer Text */}
        {/* <p className="text-sm text-[#262E84] text-center mt-3">
          Please check your Email Inbox
        </p> */}
        <Link
         href="/login" className="text-sm text-[#262E84] text-center mt-3">
         Login?
        </Link>
      </div>
      </form>
    )
}

