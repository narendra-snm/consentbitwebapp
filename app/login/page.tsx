export default function LoginPage() {
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

      {/* Login Section */}
      <div className="flex flex-col items-center w-full max-w-[463px]">

        {/* Title */}
        <h1 className="text-[40px] font-normal text-[#2C3E8F] mb-6">
          Log In
        </h1>

        {/* Email Input */}
        <input
          type="email"
          placeholder="Email ID"
          className="w-full border text-lg border-gray-300 rounded-[9px] px-4 py-4 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#262E84] placeholder:text-[#262E84]"
        />
    
        {/* Helper Text */}
        <p className="text-sm text-[#262E84] text-center mt-5 mb-10 ">
          *Please use the exact mail as the webflow native app/iframe native app
        </p>

        {/* Button */}
        <button className="w-full mb-5 bg-[#2C3E8F] hover:bg-[#24347a] text-white py-6 rounded-md transition">
          Send Magic Link
        </button>

        {/* Footer Text */}
        <p className="text-sm text-[#262E84] text-center mt-3">
          Please check your Email Inbox
        </p>
      </div>
    </div>
  );
}