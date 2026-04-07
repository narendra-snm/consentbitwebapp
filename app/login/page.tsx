export const runtime = 'edge';
import { LoginForm } from "../../components/auth/LoginForm";
import  Footer  from "@/components/auth/Footer";
export default function LoginPage() {
  return (
    <div  style={{
        backgroundImage: "url('/images/login.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}>
     <div className="py-5 pt-12 px-4 flex justify-center w-full">
        <img
          src="/images/ConsentBit-logo-Dark.png"
          alt="logo"
          className="h-8"
        />
      </div>
    <div
      className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center bg-cover bg-center px-6"
     
    >
      {/* Logo */}
     

      {/* Login Section */}
      <LoginForm /> 
      
    </div>
     <Footer/>
    </div>
  );
}