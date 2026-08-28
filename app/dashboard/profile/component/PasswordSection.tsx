"use client";

import { useEffect, useState } from "react";
import { getMe, setPassword as setPasswordRequest } from "@/lib/client-api";

const INPUT_CLASS =
  "w-full min-h-[48px] px-3 pr-16 border border-[#E5E5E5] rounded-md text-[#111827] bg-white outline-none focus:border-[#6366F1] transition-colors";

/** Password input with a reveal toggle, styled to match the rest of the profile form. */
function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  autoComplete: string;
  disabled?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="relative">
      <input
        // Toggling to "text" reveals the characters; the field is still declared as a
        // password field to password managers via autoComplete.
        type={revealed ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className={INPUT_CLASS}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setRevealed((r) => !r)}
        aria-label={revealed ? "Hide password" : "Show password"}
        aria-pressed={revealed}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6B7280] hover:text-[#6366F1] transition-colors"
      >
        {revealed ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/**
 * Set a first password, or change an existing one.
 *
 * This is also the account's password-reset route: a user who has forgotten their
 * password signs in with an email code and sets a new one here, so there is no reset
 * link to expire or leak. Accounts created before passwords existed — OTP signup,
 * Webflow/Framer, migrations — land here to add one.
 */
export default function PasswordSection() {
  // null while /api/auth/me is still in flight, so the heading doesn't flip from
  // "Set a password" to "Change password" after render.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (!cancelled) setHasPassword(Boolean(me?.user?.hasPassword));
      } catch {
        // Treat an unreadable session as "no password yet" — the worker re-checks and
        // will demand the current password if one actually exists.
        if (!cancelled) setHasPassword(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = current.length > 0 || next.length > 0;

  function reset() {
    setCurrent("");
    setNext("");
    setError(null);
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);

    // Mirrors validatePasswordPolicy() in the worker, which remains the authority.
    if (hasPassword && !current) {
      setError("Enter your current password.");
      return;
    }
    if (next.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[a-zA-Z]/.test(next) || !/[0-9]/.test(next)) {
      setError("Password must contain at least one letter and one number.");
      return;
    }

    setSaving(true);
    try {
      const res = await setPasswordRequest({
        newPassword: next,
        ...(hasPassword ? { currentPassword: current } : {}),
      });
      setHasPassword(true);
      reset();
      setSuccess(res?.message || "Password updated.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSaving(false);
    }
  }

  if (hasPassword === null) {
    return (
      <div>
        <p className="text-[#4B5563] mb-2">Password</p>
        <div className="min-h-[48px] flex items-center px-3 border border-[#E5E5E5] rounded-md text-[#9CA3AF] bg-white">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[#4B5563] mb-1">{hasPassword ? "Change password" : "Set a password"}</p>
      <p className="text-[#9CA3AF] text-xs mb-2">
        {hasPassword
          ? "You can sign in with either your password or an emailed code."
          : "Your account currently signs in with an emailed code. Set a password to use that as well."}
      </p>

      <div className="flex flex-col gap-3">
        {hasPassword && (
          <PasswordInput
            value={current}
            onChange={(v) => {
              setCurrent(v);
              setError(null);
            }}
            placeholder="Current password"
            autoComplete="current-password"
            disabled={saving}
          />
        )}
        <PasswordInput
          value={next}
          onChange={(v) => {
            setNext(v);
            setError(null);
          }}
          placeholder="New password"
          autoComplete="new-password"
          disabled={saving}
        />
      </div>

      <p className="text-[#9CA3AF] text-xs mt-2">
        At least 8 characters, including a letter and a number.
      </p>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {success && <p className="text-green-600 text-xs mt-1">{success}</p>}

      {dirty && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 bg-[#6366F1] text-white text-sm rounded-md hover:bg-[#4F46E5] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : hasPassword ? "Update Password" : "Set Password"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={reset}
            className="px-4 py-2 border border-[#E5E5E5] text-[#6B7280] text-sm rounded-md hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
