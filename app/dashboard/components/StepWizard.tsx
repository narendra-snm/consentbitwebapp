"use client";

import { useState } from "react";
import { Globe, Check, Copy, Share2 } from "lucide-react";
import Image from "next/image";
import { PricingTable } from "./PricingTable";

export default function StepWizard() {
  const [step, setStep] = useState(1);

  const nextStep = () => {
    setStep((prev) => prev + 1);
  };

  return (
    <div className={`${step===3 || step===2? '':'bg-white p-8 shadow-lg '}  transition-all duration-500 ease-in-out rounded-[28px]   w-full ${step === 2 ? 'max-w-[1292px]' : step === 3 ? 'max-w-[785px]' : 'max-w-[635px]'} min-h-[513px]`}>
      {/* Title */}
      <h2 className={`text-center text-2xl font-semibold mb-8 text-black font-s ${step===3?'mb-10':'my-10'}`}> 
        Add your first domain
      </h2>

      {/* Step Indicator */}
      <div className="max-w-[478px] mx-auto">
        <div className="grid grid-cols-3 items-start mb-18 relative">
          <StepCircle number={1} label="Domain" active={step >= 1} completed={step > 1} align="start" />
          <StepCircle number={2} label="Compliance" active={step >= 2} completed={step > 2} align="center" />
          <StepCircle number={3} label="Confirm" active={step >= 3} completed={step === 3} align="end" />
        </div>

        {/* Step Content */}
        {step === 1 && <StepOne nextStep={nextStep} />}
        {/* {step === 2 && <StepTwo nextStep={nextStep} />} */}
      </div>
      {step === 2 && <PricingTable onclick={()=>setStep(3)} />}
      {step === 3 && <StepThree />}
    </div>
  );
}

function StepCircle({
  number,
  label,
  active,
  completed,
  align,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
  align: "start" | "center" | "end";
}) {
  const alignment =
    align === "start"
      ? "items-start"
      : align === "end"
      ? "items-end"
      : "items-center";

  return (
    <div className={`flex flex-col ${alignment}`}>
      {/* line */}
      {number !== 3 && (
        <div className="absolute top-4 w-full h-[2px] bg-gray-300 z-0" />
      )}

      {/* circle */}
      <div
        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-lg mb-2 transition-all duration-300 ease-in-out ${
          completed
            ? "bg-[#007AFF] text-white border-[#cfe6ff] border-3"
            : active
            ? "bg-[#007AFF] text-white border-[#cfe6ff] border-3"
            : "bg-[#F5F0F0] text-[#007AFF]"
        }`}
      >
        {completed ? <Check className="w-5 h-5" /> : number}
      </div>

      <span className="text-xs text-gray-700">{label}</span>
    </div>
  );
}

function StepOne({ nextStep }: { nextStep: () => void }) {
  const [domain, setDomain] = useState("");

  return (
    <>
      <div className="mb-3.5">
        <div className="flex justify-between items-center mb-2">
          <label className="text-[15px] text-black ">Domain*</label>
          <span className="text-[15px] text-[#00000050]">What is your sites domain?</span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Yoursite.com"
            className="placeholder:text-[#000000] placeholder:text-base w-full px-4 py-3.5 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
         <p className="text-[15px] text-[#00000050] ">
          Do not include 'https://www'
        </p>
        <button
          onClick={nextStep}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          Next
          <span>→</span>
        </button>
      </div>
    </>
  );
}

function StepTwo({ nextStep }: { nextStep: () => void }) {
  const [compliance, setCompliance] = useState("GDPR");

  return (
    <>
      <div className="mb-3.5">
        <div className="flex justify-between items-center mb-2">
          <label className="text-[15px] text-black">
            Which Compliance would you like to set-up?"
          </label>
        </div>

        {/* Dropdown */}
        <div className="relative">
          <select
            value={compliance}
            onChange={(e) => setCompliance(e.target.value)}
            className="appearance-none w-full px-4 text-black py-3.5 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="GDPR">GDPR</option>
            <option value="GDPR_CCPA">GDPR + CCPA 💎</option>
          </select>

          {/* dropdown arrow */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
           <svg width="8" height="6" viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M-5.91049e-06 1.50649e-05L3.67999 3.92002L7.37599 1.53873e-05L7.37599 1.71202L3.67999 5.61602L-5.98533e-06 1.71202L-5.91049e-06 1.50649e-05Z" fill="#111827"/>
</svg>
          </div>
        </div>
      </div>

      {/* Pro Plan Card */}
      {compliance === "GDPR_CCPA" && (
        <div className="bg-[#CCE4FF] rounded-lg py-5.5 px-3 flex items-center justify-between mb-6">
          <p className="text-[14px] text-[#1A5EA1]">
            Adding GDPR + CCPA require a <span className="font-semibold">Proplan</span>
          </p>

          <button className="text-[#007AFF] font-semibold text-[15px] flex items-center gap-1">
           Get Pro Plan →
          </button>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <button
          className="border border-[#007AFF] text-[#007AFF] px-6 py-2 rounded-md text-sm font-medium"
        >
          Skip
        </button>

        <button
          onClick={nextStep}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          Next
          <span>→</span>
        </button>
      </div>
    </>
  );
}

function StepThree() {
  const [copied, setCopied] = useState(false);

  const codeSnippet = `<!-- Start cookieyes banner --> <script id="CookieYes" src="https://cdn-cookieyes.com/client_data/abcdef1234/script.js" async></script> <!-- End cookieyes banner -->`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platforms = [
    { name: "WordPress", icon: "🔤" },
    { name: "Wix", icon: "🌐" },
    { name: "Shopify", icon: "🛍️" },
    { name: "Magento", icon: "📦" },
    { name: "Ghost", icon: "👻" },
    { name: "Webflow", icon: "🎨" },
    { name: "Squarespace", icon: "⬜" },
    { name: "Joomla", icon: "📝" },
  ];

  return (
    <div className="  ">
      {/* Header */}
      <div className="mb-5 py-5.5 border-b-2 border-blue-200 text-center bg-[#D9E9FB] border-1 border-[#C7D9ED] ">
        <h3 className="text-lg font-semibold text-gray-800">Your Next Steps</h3>
        <p className="text-sm text-gray-600 mt-1">You are almost ready to get started. Here is what you need to do next.</p>
      </div>

      {/* Step 1 */}
      <div className="mb-6 pl-2 pr-5 py-5 bg-white border border-gray-300 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[#C2DFFF] text-[#007AFF] flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-[#007AFF] mt-1">1</div>
            <img src="/images/line.svg" alt="Verification" className="mt-1 relative -top-1" />
          </div>       
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-3">Step 1: Copy this banner installation code</h4>
            <div className="bg-[#E6F1FD] border border-[#E5E5E5] rounded p-3 mb-3">
              <code className="text-xs text-gray-700 font-mono break-words">
                {codeSnippet}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#E6F1FD] border border-[#E5E5E5] rounded-lg  text-xs font-medium  hover:bg-gray-50 transition-colors"
                >
                  
                  {copied ? "Copied!" : "Copy"}
                  <Copy size={16} />
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-[#E6F1FD] border border-[#E5E5E5] rounded-lg text-xs font-medium  hover:bg-gray-50 transition-colors">
                  <Share2 size={16} />
                </button>
              </div>
              <button className="px-4 py-3.25 bg-[#007AFF] flex items-center gap-1  hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
              <svg width="13" height="12" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 4.50143C0 4.42704 0 4.35264 0 4.27824C0.643143 2.98583 1.28935 1.69492 1.92698 0.399793C2.06298 0.123555 2.27691 0.0012224 2.57011 0.00105058C5.04023 -0.000393703 7.51034 -0.000231926 9.98046 0.000827438C10.2748 0.000953513 10.4888 0.125652 10.6241 0.399909C11.2629 1.69452 11.9085 2.98578 12.5517 4.27824V4.50143C12.4753 4.62589 12.4159 4.76553 12.32 4.87256C10.5549 6.84395 8.78444 8.81063 7.01725 10.7802C6.39619 11.4724 6.15288 11.4723 5.53262 10.7804C3.79101 8.8378 2.04581 6.89836 0.306355 4.95379C0.186041 4.81929 0.101289 4.65296 0 4.50143ZM6.27594 9.01873C6.83174 7.6478 7.36066 6.34319 7.89512 5.02489H4.65504C5.19435 6.35372 5.72142 7.65243 6.27594 9.01873ZM4.65806 3.76038H7.85845C7.86042 3.71983 7.86978 3.68979 7.86193 3.66525C7.61949 2.90761 7.37951 2.1491 7.12439 1.39572C7.10173 1.3288 6.98016 1.2563 6.90227 1.25369C6.48469 1.23972 6.06604 1.2381 5.64867 1.25492C5.56813 1.25817 5.45096 1.34636 5.42058 1.42306C5.30842 1.70627 5.22548 2.00106 5.13174 2.29156C4.97623 2.77352 4.82086 3.25553 4.65806 3.76038ZM8.38873 1.24795C8.65934 2.08586 8.90933 2.86678 9.16772 3.64492C9.18548 3.69842 9.26532 3.76696 9.31736 3.76789C9.83309 3.77706 10.3491 3.77344 10.861 3.77344C10.868 3.73008 10.879 3.7083 10.8725 3.69517C10.4873 2.91668 10.1024 2.13801 9.71025 1.36303C9.68354 1.31024 9.60195 1.25454 9.54446 1.253C9.17565 1.2431 8.80644 1.24795 8.38873 1.24795ZM3.34678 3.7657C3.61469 2.93699 3.88188 2.11052 4.16107 1.2469C3.77016 1.2469 3.43748 1.25583 3.10563 1.24312C2.94072 1.23681 2.85943 1.2996 2.78908 1.44381C2.44465 2.14984 2.08863 2.8502 1.73865 3.55352C1.70773 3.61565 1.69075 3.68471 1.6619 3.7657L3.34678 3.7657ZM2.01811 5.00584C2.79988 5.87427 3.52913 6.68437 4.25838 7.49446C3.98759 6.68553 3.67386 5.90781 3.35046 5.13412C3.32638 5.07652 3.23405 5.01355 3.17154 5.01151C2.81309 4.99984 2.45407 5.00584 2.01811 5.00584ZM8.24906 7.45636C8.26215 7.47127 8.27525 7.48618 8.28835 7.50108C9.02081 6.68639 9.75326 5.8717 10.5313 5.00629C10.0924 5.00629 9.72532 4.99993 9.35891 5.01279C9.30036 5.01485 9.21767 5.09178 9.19204 5.15324C8.87278 5.91889 8.56201 6.68808 8.24906 7.45636Z" fill="white"/>
</svg>
  Customize your banner →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="mb-6 pl-2 pr-5 py-5 bg-white border border-gray-300 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[#C2DFFF] text-[#007AFF] flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-[#007AFF] mt-1">2</div>
            <img src="/images/line.svg" alt="Verification" className="mt-1 relative -top-1" />
          </div>     
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">Paste the code right after the opening {`<head>`} tag in your site's source code.</h4>
            <p className="text-sm text-gray-600 mb-3">Refer to our platform-wise guides for instructions.</p>
            <div className="flex flex-wrap gap-2">
              {/* {platforms.map((platform) => (
                <div key={platform.name} className="w-8 h-8 rounded bg-white border border-gray-300 flex items-center justify-center text-lg hover:shadow-md transition-shadow cursor-pointer">
                  {platform.icon}
                </div>
              ))} */}

              <img
          src="/images/platform.svg"
          alt="Supported Platforms"
        />
            </div>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className=" pl-2 pr-5 py-5 bg-white border border-gray-300 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[#C2DFFF] text-[#007AFF] flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-[#007AFF] mt-1">3</div>
            <img src="/images/line.svg" alt="Verification" className="mt-1 relative -top-1" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Step 3: Verify your installation.</h4>
                <div className="flex items-center gap-2 mb-2 bg-[#E6F1FD] rounded-[60px] w-fit px-2 py-1">
                  <span className="text-lg"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" rx="12" fill="white"/>
<path d="M12.0007 5.33325C8.32465 5.33325 5.33398 8.32392 5.33398 11.9999C5.33398 15.6759 8.32465 18.6666 12.0007 18.6666C15.6767 18.6666 18.6673 15.6759 18.6673 11.9999C18.6673 8.32392 15.6767 5.33325 12.0007 5.33325ZM17.288 11.3333H15.4453C15.3631 9.87408 14.9548 8.4519 14.2507 7.17125C15.0668 7.55262 15.7732 8.13418 16.3043 8.86186C16.8353 9.58953 17.1737 10.4397 17.288 11.3333ZM12.354 6.68459C13.044 7.59392 13.972 9.20459 14.1053 11.3333H10.0207C10.1133 9.60259 10.6833 7.98125 11.6547 6.68392C11.7693 6.67725 11.884 6.66659 12.0007 6.66659C12.12 6.66659 12.2367 6.67725 12.354 6.68459ZM9.79265 7.15125C9.13665 8.41192 8.75798 9.84125 8.68732 11.3333H6.71332C6.8285 10.4318 7.17174 9.57465 7.71058 8.84286C8.24942 8.11107 8.96604 7.52884 9.79265 7.15125ZM6.71332 12.6666H8.69598C8.78665 14.2526 9.13932 15.6519 9.73332 16.8199C8.92145 16.4372 8.21914 15.856 7.69129 15.1301C7.16344 14.4042 6.82709 13.5569 6.71332 12.6666ZM11.634 17.3153C10.7 16.1833 10.1487 14.5973 10.028 12.6666H14.1033C13.9647 14.5153 13.3587 16.1306 12.368 17.3146C12.2467 17.3226 12.1253 17.3333 12.0007 17.3333C11.8767 17.3333 11.756 17.3226 11.634 17.3153ZM14.308 16.8006C14.9447 15.6046 15.3333 14.1999 15.4353 12.6666H17.2873C17.1748 13.5494 16.8433 14.3901 16.3229 15.1122C15.8026 15.8342 15.1099 16.4146 14.308 16.8006Z" fill="#4B5563"/>
</svg>
</span>
                  <p className="text-sm text-gray-600">Yoursite.com</p>
                </div>
                <p className="text-sm text-gray-600">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                </p>
              </div>
              <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded flex-shrink-0 ml-4 transition-colors">
                Verify
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
