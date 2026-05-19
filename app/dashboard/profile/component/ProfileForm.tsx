"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  name?: string;
  email?: string;
  billingEmail?: string;
  onSaveBillingEmail?: (email: string) => Promise<void>;
  onSaveName?: (name: string) => Promise<void>;
  billingEmailSaving?: boolean;
  billingEmailError?: string | null;
  billingEmailSuccess?: boolean;
};

export default function ProfileDisplay({
  name,
  email,
  billingEmail = "",
  onSaveBillingEmail,
  onSaveName,
  billingEmailSaving,
  billingEmailError,
  billingEmailSuccess,
}: Props) {
  const initialName = String(name || "").trim();
  const displayEmail = String(email || "").trim() || "Not available";

  // ── Name ──────────────────────────────────────────────────────────────
  const [nameInput, setNameInput] = useState(initialName);
  const [nameOriginal, setNameOriginal] = useState(initialName);
  const [isNameDirty, setIsNameDirty] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  // ── Billing Email ──────────────────────────────────────────────────────
  const [billingEmailInput, setBillingEmailInput] = useState(billingEmail);
  const [billingEmailOriginal, setBillingEmailOriginal] = useState(billingEmail);
  const [isBillingEmailDirty, setIsBillingEmailDirty] = useState(false);
  // Ref so the useEffect below always reads the latest dirty value (no stale closure)
  const billingDirtyRef = useRef(false);

  const markBillingDirty = (v: boolean) => {
    billingDirtyRef.current = v;
    setIsBillingEmailDirty(v);
  };

  // When the billing email prop changes (session data loads after mount),
  // update inputs ONLY if the user hasn't started editing yet.
  useEffect(() => {
    if (!billingDirtyRef.current) {
      setBillingEmailInput(billingEmail);
      setBillingEmailOriginal(billingEmail);
    }
  }, [billingEmail]);

  // After parent confirms billing email saved, clear dirty flag
  useEffect(() => {
    if (billingEmailSuccess) {
      setBillingEmailOriginal(billingEmailInput);
      markBillingDirty(false);
    }
    // billingEmailInput omitted on purpose — only re-run when success flag changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingEmailSuccess]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!nameInput.trim()) { setNameError("Name cannot be empty"); return; }
    setNameSaving(true);
    setNameError(null);
    setNameSuccess(false);
    try {
      await onSaveName?.(nameInput.trim());
      setNameOriginal(nameInput.trim());
      setIsNameDirty(false);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      setNameError(err?.message || "Failed to save name");
    } finally {
      setNameSaving(false);
    }
  };

  const handleCancelName = () => {
    setNameInput(nameOriginal);
    setIsNameDirty(false);
    setNameError(null);
  };

  const handleCancelBillingEmail = () => {
    setBillingEmailInput(billingEmailOriginal);
    markBillingDirty(false);
  };

  const previewName = nameInput.trim() || displayEmail;

  return (
    <div className="flex gap-[227px] pl-5 bg-white w-full justify-between max-w-[1193px]">

      {/* Left Info */}
      <div className="flex flex-col gap-6 w-[376px] text-left">

        {/* Name */}
        <div>
          <p className="text-[#4B5563] mb-2">Name</p>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              setIsNameDirty(true);
              setNameError(null);
            }}
            placeholder={displayEmail !== "Not available" ? displayEmail : "Enter your name"}
            className="w-full min-h-[48px] px-3 border border-[#E5E5E5] rounded-md text-[#111827] bg-white outline-none focus:border-[#6366F1] transition-colors"
          />
          {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
          {nameSuccess && <p className="text-green-600 text-xs mt-1">Name saved.</p>}
          {isNameDirty && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                disabled={nameSaving}
                onClick={handleSaveName}
                className="px-4 py-2 bg-[#6366F1] text-white text-sm rounded-md hover:bg-[#4F46E5] disabled:opacity-50 transition-colors"
              >
                {nameSaving ? "Saving…" : "Save Name"}
              </button>
              <button
                type="button"
                disabled={nameSaving}
                onClick={handleCancelName}
                className="px-4 py-2 border border-[#E5E5E5] text-[#6B7280] text-sm rounded-md hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <p className="text-[#4B5563] mb-2">Email</p>
          <div className="min-h-[48px] flex items-center px-3 border border-[#E5E5E5] rounded-md text-[#111827] bg-white">
            {displayEmail}
          </div>
        </div>

        {/* Billing Email */}
        <div>
          <p className="text-[#4B5563] mb-1">Billing Email</p>
          <p className="text-[#9CA3AF] text-xs mb-2">
            Invoice and payment emails are sent here. Leave blank to use your primary email.
          </p>
          <input
            type="email"
            value={billingEmailInput}
            onChange={(e) => {
              setBillingEmailInput(e.target.value);
              markBillingDirty(true);
            }}
            placeholder={displayEmail !== "Not available" ? displayEmail : "Billing email address"}
            className="w-full min-h-[48px] px-3 border border-[#E5E5E5] rounded-md text-[#111827] bg-white outline-none focus:border-[#6366F1] transition-colors"
          />
          {billingEmailError && <p className="text-red-500 text-xs mt-1">{billingEmailError}</p>}
          {billingEmailSuccess && <p className="text-green-600 text-xs mt-1">Billing email saved.</p>}
          {isBillingEmailDirty && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                disabled={billingEmailSaving}
                onClick={() => onSaveBillingEmail?.(billingEmailInput)}
                className="px-4 py-2 bg-[#6366F1] text-white text-sm rounded-md hover:bg-[#4F46E5] disabled:opacity-50 transition-colors"
              >
                {billingEmailSaving ? "Saving…" : "Save Billing Email"}
              </button>
              <button
                type="button"
                disabled={billingEmailSaving}
                onClick={handleCancelBillingEmail}
                className="px-4 py-2 border border-[#E5E5E5] text-[#6B7280] text-sm rounded-md hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Right Preview Card */}
      <div className="flex-1 max-w-[554px] bg-[#FBFBFB] border border-[#EBEBEB] rounded-lg px-6.5 py-6.75 flex flex-col text-left">
        <img
          src="/images/profile.svg"
          alt="Profile"
          className="w-14 h-14 rounded-full object-cover mb-3.75"
        />
        <p className={!nameInput.trim() ? "text-[#9CA3AF] text-sm" : ""}>
          {previewName}
        </p>
        <p className="mt-3">{displayEmail}</p>
        {billingEmailInput && billingEmailInput !== displayEmail && (
          <p className="mt-2 text-xs text-[#9CA3AF]">
            Billing emails → {billingEmailInput}
          </p>
        )}
      </div>

    </div>
  );
}
