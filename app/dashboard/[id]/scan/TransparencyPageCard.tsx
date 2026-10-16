'use client';

// Hosted cookie transparency page: a public, always-current list of this site's
// cookies at <worker>/cookie-list/<domain>, built from the latest scan. Off until the
// customer switches it on. The worker (handlers/transparencyPage.js) owns the page,
// the access check and the TEST-ONLY flag — when the flag is off the settings call
// 404s and this card renders nothing.

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { parseApiResponse } from '@/lib/client-api';

const dm: CSSProperties = { fontVariationSettings: "'opsz' 14" };
const INTRO_MAX = 1000;

type TransparencySettings = {
  success: boolean;
  error?: string;
  domain: string;
  enabled: boolean;
  intro: string;
  updatedAt: string | null;
  publicUrl: string | null;
};

async function fetchSettings(siteId: string): Promise<TransparencySettings | null> {
  const res = await fetch(`/api/transparency-page?siteId=${encodeURIComponent(siteId)}`, {
    credentials: 'include',
  });
  if (res.status === 404) return null; // feature off on this worker
  const data = await parseApiResponse(res);
  if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to load (${res.status})`);
  return data as TransparencySettings;
}

async function saveSettings(siteId: string, enabled: boolean, intro: string): Promise<TransparencySettings> {
  const res = await fetch('/api/transparency-page', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, enabled, intro }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to save (${res.status})`);
  return data as TransparencySettings;
}

export function TransparencyPageCard({ siteId }: { siteId: string }) {
  const [settings, setSettings] = useState<TransparencySettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [intro, setIntro] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const apply = useCallback((s: TransparencySettings) => {
    setSettings(s);
    setEnabled(s.enabled);
    setIntro(s.intro || '');
  }, []);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    fetchSettings(siteId)
      .then((s) => { if (active && s) apply(s); })
      .catch((e) => { if (active) setLoadError(e?.message || 'Could not load transparency page settings.'); });
    return () => { active = false; };
  }, [siteId, apply]);

  const onSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      apply(await saveSettings(siteId, enabled, intro));
      setSavedAt(Date.now());
    } catch (e: any) {
      setSaveError(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const onCopy = async () => {
    if (!settings?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(settings.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the URL is visible to copy by hand */
    }
  };

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 mt-4">
        {loadError}
      </div>
    );
  }
  if (!settings) return null;

  const dirty = enabled !== settings.enabled || intro.trim() !== (settings.intro || '');

  return (
    <div className="bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px] px-[21px] py-[16px] mt-4">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-[240px] flex-1">
          <h2 className="font-['DM_Sans'] font-semibold text-[14px] text-black" style={dm}>
            Cookie transparency page
          </h2>
          <p className="font-['DM_Sans'] text-[12px] text-black/60 mt-1" style={dm}>
            A public page listing every cookie found on {settings.domain || 'your site'} — what it does, who sets it
            and how long it lasts. It updates itself after each scan. Link it from your cookie policy or footer.
          </p>
        </div>

        <label className="flex items-center gap-2 font-['DM_Sans'] text-[13px] text-black cursor-pointer" style={dm}>
          <input
            type="checkbox"
            checked={enabled}
            disabled={saving}
            onChange={(e) => { setEnabled(e.target.checked); setSavedAt(null); }}
            className="h-4 w-4 accent-[#007aff]"
          />
          Publish page
        </label>
      </div>

      <div className="mt-3">
        <label className="block font-['DM_Sans'] text-[12px] text-black/70 mb-1" style={dm} htmlFor="tp-intro">
          Introduction (optional)
        </label>
        <textarea
          id="tp-intro"
          value={intro}
          maxLength={INTRO_MAX}
          rows={3}
          disabled={saving}
          onChange={(e) => { setIntro(e.target.value); setSavedAt(null); }}
          placeholder={`This page lists the cookies used on ${settings.domain || 'our website'}…`}
          className="w-full font-['DM_Sans'] text-[13px] border border-[#dcdcdc] rounded-md bg-white px-2 py-[6px] disabled:opacity-60"
          style={dm}
        />
      </div>

      {settings.publicUrl && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <code className="font-mono text-[12px] bg-white border border-[#dcdcdc] rounded-md px-2 py-[5px] break-all">
            {settings.publicUrl}
          </code>
          <button
            type="button"
            onClick={onCopy}
            className="font-['DM_Sans'] text-[12px] border border-[#dcdcdc] rounded-md bg-white px-2 py-[5px]"
            style={dm}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
          {settings.enabled && (
            <a
              href={settings.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-['DM_Sans'] text-[12px] text-[#007aff] underline"
              style={dm}
            >
              Open page
            </a>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="font-['DM_Sans'] text-[13px] font-medium rounded-md bg-[#007aff] text-white px-3 py-[6px] disabled:opacity-40"
          style={dm}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <span className="font-['DM_Sans'] text-[12px]" style={dm}>
          {saveError && <span className="text-red-700">{saveError}</span>}
          {savedAt && !saveError && <span className="text-green-700">Saved.</span>}
          {!settings.enabled && !savedAt && !saveError && (
            <span className="text-black/60">Not published — the link shows &quot;not found&quot; until you publish.</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default TransparencyPageCard;
