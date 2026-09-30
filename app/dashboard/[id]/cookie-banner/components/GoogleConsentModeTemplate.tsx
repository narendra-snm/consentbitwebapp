"use client";

import ToggleSwitch from "./ui/ToggleSwitch";
import { GOOGLE_PRIVACY_URL } from "./googlePrivacyLink";

/** Help-center article explaining Google's banner requirements. */
const HELP_URL = "https://www.consentbit.com/articles/create-a-banner-that-meets-googles-requirements";

/**
 * Google Consent Mode banner template — Content tab.
 *
 * Google's CMP Partner requirements (Consent Mode without TCF) ask for a banner template
 * that explains the purpose of the data collection, links to Google's partner-sites
 * privacy page from inside the banner, and offers an affirmative consent option — and for
 * the UI to RECOMMEND that template. The recommendation shows until the link is on;
 * rendered only for GDPR copy with IAB off (the IAB banner has its own Google disclosure).
 */
export default function GoogleConsentModeTemplate({
  enabled,
  customizeButton,
  onToggle,
  onApplyTemplate,
}: {
  enabled: boolean;
  customizeButton: boolean;
  onToggle: () => void;
  onApplyTemplate: () => void;
}) {
  return (
    <div className="w-full max-w-[409px] mx-auto mb-6 space-y-3">
      {!enabled && (
        <div className="rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 space-y-2">
          <p className="font-['DM_Sans'] text-sm font-medium text-[#1e3a8a]">
            Using Google Consent Mode? We recommend the Google Consent Mode template.
          </p>
          <p className="font-['DM_Sans'] text-xs leading-5 text-[#1e40af]">
            It explains why data is collected, includes an Accept button, and adds the link to
            Google&apos;s page &ldquo;How Google uses data when you use our partners&apos; sites or apps&rdquo;
            inside the banner, as Google requires.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onApplyTemplate}
              className="rounded-md bg-[#007aff] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0066d6] transition"
            >
              Apply template
            </button>
            <a
              href={HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#1d4ed8] underline"
            >
              Learn more
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <label
          className="block font-['DM_Sans'] font-normal text-base text-black leading-5"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Google privacy link
          <span className="block text-xs text-[#6B7280] mt-1">
            Shows{" "}
            <a href={GOOGLE_PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline">
              How Google uses data
            </a>{" "}
            under Marketing in the preferences panel.
          </span>
        </label>
        <ToggleSwitch checked={enabled} onChange={onToggle} />
      </div>

      {enabled && !customizeButton && (
        <p className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 font-['DM_Sans'] text-xs text-[#92400e]">
          The Google link lives in the preferences panel, which visitors open with the Customize
          button. Turn the Customize button back on so visitors can reach it.
        </p>
      )}
    </div>
  );
}
