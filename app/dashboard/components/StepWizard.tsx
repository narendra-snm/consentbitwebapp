"use client";

import { useState } from "react";
import { Globe, Check, Copy, Share2 } from "lucide-react";
import Image from "next/image";
import { PricingTable } from "./PricingTable";
import { firstSetup, verifyScript } from "@/lib/client-api";
import { useRouter } from "next/navigation";

export default function StepWizard({
  userName,
  organizationId,
  onWizardComplete,
}: {
  userName?: string;
  organizationId?: string | null;
  onWizardComplete?: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [siteData, setSiteData] = useState<{ scriptUrl?: string; siteId?: string; domain?: string } | null>(null);

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
        {step === 1 && (
          <StepOne
            userName={userName}
            nextStep={nextStep}
            onSetupComplete={(data) => setSiteData(data)}
          />
        )}
        {/* {step === 2 && <StepTwo nextStep={nextStep} />} */}
      </div>
      {step === 2 && <PricingTable onclick={()=>setStep(3)} organizationId={organizationId} />}
      {step === 3 && <StepThree siteData={siteData} onWizardComplete={onWizardComplete} />}
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

function StepOne({
  nextStep,
  userName,
  onSetupComplete,
}: {
  nextStep: () => void;
  userName?: string;
  onSetupComplete: (data: { scriptUrl?: string; siteId?: string; domain?: string }) => void;
}) {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNext() {
    if (!domain.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const result = await firstSetup({ websiteUrl: domain.trim() });
      onSetupComplete({
        scriptUrl: result?.scriptUrl ?? result?.site?.scriptUrl,
        siteId: result?.siteId ?? result?.site?.id,
        domain: domain.trim(),
      });
      nextStep();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

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
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-[15px] text-[#00000050] ">
          Do not include 'https://www'
        </p>
        <button
          onClick={handleNext}
          disabled={loading || !domain.trim()}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {loading ? 'Setting up…' : 'Next'}
          {!loading && <span>→</span>}
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

function StepThree({
  siteData,
  onWizardComplete,
}: {
  siteData: { scriptUrl?: string; siteId?: string; domain?: string } | null;
  onWizardComplete?: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState(siteData?.domain || '');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const scriptUrl = siteData?.scriptUrl || (siteData?.siteId ? `/client_data/${siteData.siteId}/script.js` : '');
  const codeSnippet = scriptUrl
    ? `<!-- Start ConsentBit banner --> <script id="consentbit" src="${scriptUrl}" async></script> <!-- End ConsentBit banner -->`
    : `<!-- Start ConsentBit banner --> <script id="consentbit" src="YOUR_SCRIPT_URL" async></script> <!-- End ConsentBit banner -->`;

  const normalizePublicUrl = (value: string) => {
    const v = value.trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
  };

  const handleVerify = async () => {
    setVerifyError(null);
    setVerified(false);
    const url = normalizePublicUrl(publicUrl);
    if (!url) {
      setVerifyError('Enter a website domain or URL');
      return;
    }
    if (!scriptUrl) {
      setVerifyError('Missing script URL for this site');
      return;
    }
    setVerifying(true);
    try {
      const res = await verifyScript({
        publicUrl: url,
        scriptUrl,
        siteId: siteData?.siteId,
      });
      if (res.found) {
        setVerified(true);
      } else {
        setVerifyError('Script not found on your site yet. Please publish the changes and try again.');
      }
    } catch (e: unknown) {
      setVerifyError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goToCookieBanner = () => {
    const id = siteData?.siteId;
    if (id) router.push(`/dashboard/${id}/cookie-banner`);
  };

  const goToDashboard = async () => {
    const id = siteData?.siteId;
    if (onWizardComplete) await onWizardComplete();
    if (id) router.push(`/dashboard/${id}`);
    else router.push("/dashboard");
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
            <img src="/images/line.svg" alt="Verification" className="mt-1" />
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
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#E6F1FD] border border-[#E5E5E5] rounded rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy size={16} />
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-[#E6F1FD] border border-[#E5E5E5] rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Share2 size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={goToCookieBanner}
                disabled={!siteData?.siteId}
                className="px-4 py-3.25 bg-[#007AFF] hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
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
            <img src="/images/line.svg" alt="Verification" className="mt-1" />
          </div>     
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">Paste the code right after the opening {`<head>`} tag in your site's source code.</h4>
            <p className="text-sm text-gray-600 mb-3">Refer to our platform-wise guides for instructions.</p>
            <div className="flex flex-wrap gap-2">
              {platforms.map((platform) => (
                <div key={platform.name} className="w-8 h-8 rounded bg-white border border-gray-300 flex items-center justify-center text-lg hover:shadow-md transition-shadow cursor-pointer">
                  {platform.icon}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className=" pl-2 pr-5 py-5 bg-white border border-gray-300 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[#C2DFFF] text-[#007AFF] flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-[#007AFF] mt-1">3</div>
            <img src="/images/line.svg" alt="Verification" className="mt-1" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Step 3: Verify your installation.</h4>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🌐</span>
                  <input
                    type="text"
                    value={publicUrl}
                    onChange={(e) => setPublicUrl(e.target.value)}
                    placeholder="yoursite.com"
                    className="border rounded-md px-3 py-2 text-sm w-[260px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={verifying}
                  />
                </div>
                {verified && (
                  <p className="text-sm text-emerald-700 font-medium">
                    Verified! We detected the ConsentBit script on your site.
                  </p>
                )}
                {verifyError && (
                  <p className="text-sm text-[#AC2734] font-medium">
                    {verifyError}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                </p>
              </div>
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium rounded flex-shrink-0 ml-4 transition-colors"
              >
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Finish */}
      <div className="flex justify-end mt-8 pr-5">
        <button
          type="button"
          onClick={goToDashboard}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-8 py-3 rounded-md font-medium transition-colors flex items-center gap-2"
          disabled={!siteData?.siteId}
        >
          Go to Dashboard →
        </button>
      </div>
    </div>
  );
}
