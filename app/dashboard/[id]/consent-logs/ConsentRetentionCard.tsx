'use client';

// How long this site's consent records are kept. The plan sets the allowed range
// (worker: services/consentRetention.js → RETENTION_PLAN_LIMITS); the customer picks
// inside it. The worker validates every save — this card only presents the choices.
//
// Deletion itself is switched on separately (CONSENT_RETENTION_MODE on the worker),
// so a saved period may not be enforced yet; `mode` in the response says which.

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { parseApiResponse } from '@/lib/client-api';

const dm: CSSProperties = { fontVariationSettings: "'opsz' 14" };

type RetentionMode = 'off' | 'dry-run' | 'on';

type RetentionSettings = {
  success: boolean;
  error?: string;
  planId: string | null;
  planKnown: boolean;
  limits: { minDays: number; maxDays: number; defaultDays: number };
  choices: number[];
  chosenDays: number | null;
  effectiveDays: number;
  mode: RetentionMode;
};

async function fetchRetention(siteId: string): Promise<RetentionSettings> {
  const res = await fetch(`/api/consent-retention?siteId=${encodeURIComponent(siteId)}`, {
    credentials: 'include',
  });
  const data = await parseApiResponse(res);
  if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to load (${res.status})`);
  return data as RetentionSettings;
}

async function saveRetention(siteId: string, days: number | null): Promise<RetentionSettings> {
  const res = await fetch('/api/consent-retention', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, days }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to save (${res.status})`);
  return data as RetentionSettings;
}

function labelDays(days: number): string {
  if (days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? '1 year' : `${years} years`;
  }
  return `${days} days`;
}

const MODE_NOTE: Record<RetentionMode, string> = {
  off: 'Automatic deletion is not active yet. Your choice is saved and will apply once it is switched on.',
  'dry-run': 'Automatic deletion is in test mode — records are counted, nothing is deleted yet.',
  on: 'Records older than this are deleted automatically, once a day.',
};

export function ConsentRetentionCard({ siteId }: { siteId: string }) {
  const [settings, setSettings] = useState<RetentionSettings | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const apply = useCallback((s: RetentionSettings) => {
    setSettings(s);
    setSelected(s.effectiveDays);
  }, []);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    fetchRetention(siteId)
      .then((s) => { if (active) apply(s); })
      .catch((e) => { if (active) setLoadError(e?.message || 'Could not load retention settings.'); });
    return () => { active = false; };
  }, [siteId, apply]);

  const onSave = async () => {
    if (selected == null) return;
    setSaving(true);
    setSaveError(null);
    try {
      apply(await saveRetention(siteId, selected));
      setSavedAt(Date.now());
    } catch (e: any) {
      setSaveError(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {loadError}
      </div>
    );
  }
  if (!settings) return null;

  const onlyOneChoice = settings.choices.length <= 1;
  const dirty = selected != null && selected !== settings.effectiveDays;

  return (
    <div className="bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px] px-[21px] py-[16px]">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-[240px] flex-1">
          <h2 className="font-['DM_Sans'] font-semibold text-[14px] text-black" style={dm}>
            Consent record retention
          </h2>
          <p className="font-['DM_Sans'] text-[12px] text-black/60 mt-1" style={dm}>
            How long ConsentBit keeps this site&apos;s consent records before deleting them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="font-['DM_Sans'] text-[13px] border border-[#dcdcdc] rounded-md bg-white px-2 py-[6px] disabled:opacity-60"
            style={dm}
            value={selected ?? ''}
            disabled={onlyOneChoice || saving || !settings.planKnown}
            onChange={(e) => { setSelected(Number(e.target.value)); setSavedAt(null); }}
            aria-label="Consent record retention period"
          >
            {settings.choices.map((d) => (
              <option key={d} value={d}>
                {labelDays(d)}
                {d === settings.limits.defaultDays ? ' (default)' : ''}
              </option>
            ))}
          </select>
          {!onlyOneChoice && (
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || saving || !settings.planKnown}
              className="font-['DM_Sans'] text-[13px] font-medium rounded-md bg-[#007aff] text-white px-3 py-[6px] disabled:opacity-40"
              style={dm}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <div className="font-['DM_Sans'] text-[12px] mt-3 space-y-1" style={dm}>
        {!settings.planKnown && (
          <p className="text-amber-700">We couldn&apos;t verify your plan just now, so changes are disabled. Please reload.</p>
        )}
        {onlyOneChoice && settings.planKnown && (
          <p className="text-black/60">
            Your plan keeps records for {labelDays(settings.effectiveDays)}.{' '}
            <Link href={`/dashboard/${siteId}/upgrade`} className="text-[#007aff] underline">
              Upgrade
            </Link>{' '}
            to keep them longer.
          </p>
        )}
        <p className={settings.mode === 'on' ? 'text-black/60' : 'text-amber-700'}>{MODE_NOTE[settings.mode]}</p>
        {saveError && <p className="text-red-700">{saveError}</p>}
        {savedAt && !saveError && <p className="text-green-700">Saved.</p>}
      </div>
    </div>
  );
}

export default ConsentRetentionCard;
