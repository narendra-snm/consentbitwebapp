"use client";

import { useEffect, useMemo, useState } from "react";
import ColorPickerPanel from "./ColorPickerPanel";
import BannerControl from "./BannerControl";
import ConsentPreview from "./ConsentPreview";
import type { AppearanceState } from "./bannerAppearance";
import { appearanceFromCustomization } from "./bannerAppearance";
import { LANGUAGE_OPTIONS } from "./translations";
import { makeDefaultContentSettings } from "./bannerContentDefaults";
import {
  MAX_TEMPLATES,
  applyTemplateContent,
  buildTemplatePayload,
  listTemplates,
  saveTemplate,
  type BannerTemplate,
  type TemplateContent,
} from "./bannerTemplates";

/**
 * Template builder — design a reusable banner and save it under a name.
 *
 * Two different kinds of draft state here, for one structural reason: ConsentPreview reads
 * colors and layout from the global AppProvider context (which Container mirrors from
 * `appearance`), but takes text as a plain prop. So:
 *
 *   • appearance — driven through the parent's real setter, so the preview updates. The
 *     parent snapshots it when the builder opens and restores it on close, so designing a
 *     template never leaves edits behind on the site being viewed.
 *   • content — local to this component and handed to the preview as a prop.
 *
 * The alternative was duplicating the banner renderer for the modal, which would drift
 * from the real preview the first time either changed.
 */

type Tab = "Colors" | "Layout" | "Content";

/**
 * Fields of the content state that aren't wording — the toggles and the per-site URL. A
 * language switch must not reset them, and they must not count as "the user edited the
 * copy" when deciding whether to confirm. Mirrors NON_LINGUISTIC_CONTENT_KEYS in Container.
 */
const PER_SITE_CONTENT_KEYS = [
  "privacyPolicyUrl",
  "closeButton",
  "rejectButton",
  "customizeButton",
  "cookiePolicyLink",
] as const;

function stripPerSite(c: Record<string, any>): Record<string, any> {
  const out = { ...c };
  for (const k of PER_SITE_CONTENT_KEYS) delete out[k];
  return out;
}

function stripToPerSite(c: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of PER_SITE_CONTENT_KEYS) if (k in c) out[k] = c[k];
  return out;
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#374151]">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          rows={3}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-md border border-[#e5e5e5] px-3 py-2 text-sm text-black outline-none transition focus:border-[#007aff]"
        />
      ) : (
        <input
          type="text"
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-sm text-black outline-none transition focus:border-[#007aff]"
        />
      )}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#007aff]"
      />
      <span className="text-xs text-[#374151]">{label}</span>
    </label>
  );
}

export default function TemplateBuilderModal({
  open,
  onClose,
  onSaved,
  organizationId,
  appearance,
  onAppearanceChange,
  initialContent,
  langCode,
  customizationBase,
  consentType,
  siteDomain,
  editTemplate = null,
}: {
  open: boolean;
  /** Always called on both Save and Cancel — the parent restores its appearance snapshot. */
  onClose: () => void;
  onSaved?: (template: BannerTemplate) => void;
  organizationId?: string | null;
  appearance: AppearanceState;
  onAppearanceChange: (next: AppearanceState) => void;
  initialContent: TemplateContent;
  langCode?: string;
  customizationBase?: Record<string, any> | null;
  consentType?: "gdpr" | "ccpa" | "both";
  siteDomain?: string | null;
  /**
   * When set, the builder edits this saved template instead of snapshotting the current
   * banner: it seeds from the stored payload and saves back to the same id. The slot cap
   * and the replace-picker don't apply, since editing frees no slot and takes none.
   */
  editTemplate?: BannerTemplate | null;
}) {
  const [tab, setTab] = useState<Tab>("Colors");
  const [content, setContent] = useState<TemplateContent>(initialContent);
  /**
   * Whether this template carries the banner's wording as well as its look.
   *
   * Decided here, by the author, rather than at apply time: with only two slots the person
   * saving knows whether they're making a "brand look" or a "whole banner", and the person
   * applying it later may not.
   *
   * The language picker below re-translates the draft rather than merely relabelling it —
   * relabelling would let someone save English copy tagged French, and the runtime would
   * then wrap French section labels around English body text. Re-translating keeps the
   * label true by construction, at the cost of replacing edited wording (hence the
   * confirm), which is exactly how the editor's own language switch behaves.
   */
  const [includeText, setIncludeText] = useState(true);
  const [lang, setLang] = useState(langCode || "en");
  const [name, setName] = useState("");
  const [templates, setTemplates] = useState<BannerTemplate[]>([]);
  const [overwriteId, setOverwriteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reseed from the banner being viewed each time the builder opens, so it always starts
  // from the current design rather than whatever was left over from a previous session.
  useEffect(() => {
    if (!open) return;
    setTab("Colors");
    setError(null);
    setBusy(false);

    if (editTemplate) {
      // Editing: seed from what the template actually stores, so the builder opens on the
      // saved design rather than on whatever banner happens to be on screen behind it.
      const payload = (editTemplate.payload || {}) as Record<string, any>;
      const en = payload?.translations?.en;
      const hasText = Boolean(en && typeof en === "object" && Object.keys(en).length > 0);
      const savedLang =
        hasText && typeof en.languageSelected === "string" ? en.languageSelected : "en";

      onAppearanceChange(appearanceFromCustomization(payload));
      setLang(savedLang);
      setIncludeText(hasText);
      // Defaults for the stored language first, then the template's own wording over the
      // top — so fields the template never carried show sensible copy rather than blanks.
      setContent(
        hasText
          ? applyTemplateContent(en, makeDefaultContentSettings(savedLang) as any)
          : (makeDefaultContentSettings(savedLang) as any),
      );
      setName(editTemplate.name);
      // Reused as "the row this save targets" — also what excludes this template from its
      // own duplicate-name check.
      setOverwriteId(editTemplate.id);
    } else {
      setContent(initialContent);
      setIncludeText(true);
      setLang(langCode || "en");
      setName("");
      setOverwriteId(null);
    }

    let cancelled = false;
    void (async () => {
      const list = await listTemplates(organizationId);
      if (!cancelled) setTemplates(list);
    })();
    return () => {
      cancelled = true;
    };
    // initialContent is deliberately not a dep: it changes identity on every parent
    // render, which would reset the user's in-progress edits mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, organizationId, editTemplate?.id]);

  const isEditing = Boolean(editTemplate);
  // Editing an existing row neither consumes nor frees a slot, so the cap and the
  // replace-picker only apply when creating.
  const atLimit = !isEditing && templates.length >= MAX_TEMPLATES;
  const trimmed = name.trim();

  /**
   * Names must be unique within the org — two templates called "Brand" are impossible to
   * tell apart in the apply picker, where the name is all you get. The slot being
   * overwritten is excluded so renaming it to itself isn't reported as a clash.
   */
  const nameClash = useMemo(
    () =>
      templates.some(
        (t) =>
          t.id !== overwriteId &&
          t.name.trim().toLowerCase() === trimmed.toLowerCase() &&
          trimmed.length > 0,
      ),
    [templates, trimmed, overwriteId],
  );

  const canSave =
    !busy && trimmed.length > 0 && !nameClash && (!atLimit || Boolean(overwriteId));

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    setError(null);

    // Passing no content omits translations.en entirely, so applying this template later
    // leaves every target site's wording — and its language — untouched.
    const payload = buildTemplatePayload(
      appearance,
      customizationBase,
      includeText ? content : undefined,
      lang,
    );
    const res = await saveTemplate({
      organizationId,
      name: trimmed,
      payload,
      id: isEditing || atLimit ? overwriteId : null,
    });

    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Failed to save template");
      return;
    }
    if (res.template) onSaved?.(res.template);
    onClose();
  }

  /**
   * Change the template's language by re-translating the draft to that language's
   * defaults — the same behaviour as the editor's own language switch.
   *
   * Confirms first when the draft still differs from the defaults it started from, since
   * the switch discards that wording. Comparing against the defaults rather than tracking
   * edits means a draft the user never touched switches silently, which is the common case.
   */
  function switchLanguage(next: string) {
    if (next === lang) return;
    const untouched =
      JSON.stringify(stripPerSite(content)) ===
      JSON.stringify(stripPerSite(makeDefaultContentSettings(lang) as any));
    if (
      !untouched &&
      !window.confirm(
        "Switching language replaces the wording in this template with the default text for that language. Your edits here will be lost. Continue?",
      )
    ) {
      return;
    }
    setLang(next);
    setContent((prev) => ({
      ...(makeDefaultContentSettings(next) as any),
      // Per-site values the editor holds but a template never stores — keep whatever the
      // builder was seeded with so switching language doesn't quietly reset them.
      ...stripToPerSite(prev),
    }));
  }

  if (!open) return null;

  const cats = content.categories;
  const setCat = (
    key: "necessary" | "analytics" | "marketing" | "preferences",
    field: "name" | "description",
    v: string,
  ) =>
    setContent((c) => ({
      ...c,
      categories: { ...c.categories, [key]: { ...(c.categories[key] || {}), [field]: v } },
    }));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !busy && onClose()} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit banner template" : "Create banner template"}
        className="relative z-10 flex h-[86vh] w-[1100px] max-w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-black">
              {isEditing ? "Edit banner template" : "Create banner template"}
            </h2>
            <p className="text-xs text-[#6b7280]">
              Colors, layout and text are saved. The privacy policy URL and regulation type
              stay specific to each site.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b7280] transition hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* ── Editor ─────────────────────────────────────────────────── */}
          <div className="flex w-[380px] shrink-0 flex-col border-r border-[#e5e5e5]">
            <div className="flex shrink-0 border-b border-[#e5e5e5]">
              {(["Colors", "Layout", "Content"] as Tab[]).map((t) => {
                const locked = t === "Content" && !includeText;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    title={
                      locked
                        ? "Turn on “Include banner text” below to edit and save wording"
                        : undefined
                    }
                    className={`flex-1 border-b-2 px-3 py-2.5 text-sm transition ${
                      tab === t
                        ? "border-[#007AFF] font-medium text-[#007AFF]"
                        : locked
                        ? "border-transparent text-[#c0c4cc]"
                        : "border-transparent text-[#6b7280] hover:text-[#374151]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {tab === "Colors" && (
                <ColorPickerPanel
                  value={appearance.colors}
                  onChange={(colors) => onAppearanceChange({ ...appearance, colors })}
                />
              )}

              {tab === "Layout" && (
                <BannerControl
                  value={appearance.layout}
                  onChange={(layout) => onAppearanceChange({ ...appearance, layout })}
                />
              )}

              {tab === "Content" && !includeText && (
                <div className="rounded-lg border border-dashed border-[#d1d5db] bg-[#f9fafb] p-5 text-center">
                  <p className="text-sm text-[#374151]">Text is not part of this template</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#6b7280]">
                    Sites you apply it to will keep their own wording and language. Turn on{" "}
                    <span className="font-medium">Include banner text</span> below to edit
                    and save the copy as well.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIncludeText(true)}
                    className="mt-3 h-8 rounded-md border border-[#e5e5e5] bg-white px-3 text-xs text-[#374151] transition hover:bg-gray-50"
                  >
                    Include banner text
                  </button>
                </div>
              )}

              {tab === "Content" && includeText && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-[#f3f7ff] p-3">
                    <label
                      htmlFor="template-language"
                      className="mb-1.5 block text-xs font-medium text-[#374151]"
                    >
                      Template language
                    </label>
                    <select
                      id="template-language"
                      value={lang}
                      onChange={(e) => switchLanguage(e.target.value)}
                      className="h-9 w-full rounded-md border border-[#d7e3f7] bg-white px-2 text-sm text-black outline-none transition focus:border-[#007aff]"
                    >
                      {LANGUAGE_OPTIONS.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#6b7280]">
                      Switching language rewrites the fields below with that
                      language&rsquo;s wording, so any edits here are replaced.
                    </p>
                  </div>
                  <Field
                    label="Title"
                    value={content.title}
                    maxLength={60}
                    onChange={(v) => setContent((c) => ({ ...c, title: v }))}
                  />
                  <Field
                    label="Message (GDPR)"
                    multiline
                    value={content.gdpr.message}
                    maxLength={600}
                    onChange={(v) => setContent((c) => ({ ...c, gdpr: { ...c.gdpr, message: v } }))}
                  />
                  <Field
                    label="Message (CCPA)"
                    multiline
                    value={content.ccpa.message}
                    maxLength={600}
                    onChange={(v) => setContent((c) => ({ ...c, ccpa: { ...c.ccpa, message: v } }))}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Accept button"
                      value={content.acceptAll}
                      maxLength={20}
                      onChange={(v) => setContent((c) => ({ ...c, acceptAll: v }))}
                    />
                    <Field
                      label="Reject button"
                      value={content.gdpr.rejectAll}
                      maxLength={20}
                      onChange={(v) =>
                        setContent((c) => ({ ...c, gdpr: { ...c.gdpr, rejectAll: v } }))
                      }
                    />
                    <Field
                      label="Preferences button"
                      value={content.preferencesLabel}
                      maxLength={20}
                      onChange={(v) => setContent((c) => ({ ...c, preferencesLabel: v }))}
                    />
                    <Field
                      label="Policy link label"
                      value={content.cookiePolicyLabel}
                      maxLength={30}
                      onChange={(v) => setContent((c) => ({ ...c, cookiePolicyLabel: v }))}
                    />
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-[#e5e5e5] p-3">
                    <Toggle
                      label="Close button"
                      checked={content.closeButton}
                      onChange={(v) => setContent((c) => ({ ...c, closeButton: v }))}
                    />
                    <Toggle
                      label="Reject button"
                      checked={content.rejectButton}
                      onChange={(v) => setContent((c) => ({ ...c, rejectButton: v }))}
                    />
                    <Toggle
                      label="Preferences button"
                      checked={content.customizeButton}
                      onChange={(v) => setContent((c) => ({ ...c, customizeButton: v }))}
                    />
                  </div>

                  <div className="border-t border-[#f0f0f0] pt-4">
                    <p className="mb-3 text-xs font-semibold text-black">Preference panel</p>
                    <div className="space-y-3">
                      <Field
                        label="Panel title"
                        value={content.preferenceTitle}
                        maxLength={60}
                        onChange={(v) => setContent((c) => ({ ...c, preferenceTitle: v }))}
                      />
                      <Field
                        label="Panel message"
                        multiline
                        value={content.preferenceMessage}
                        maxLength={600}
                        onChange={(v) => setContent((c) => ({ ...c, preferenceMessage: v }))}
                      />
                      <Field
                        label="Save preferences button"
                        value={content.gdpr.saveMyPreferencesLabel}
                        maxLength={20}
                        onChange={(v) =>
                          setContent((c) => ({
                            ...c,
                            gdpr: { ...c.gdpr, saveMyPreferencesLabel: v },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="border-t border-[#f0f0f0] pt-4">
                    <p className="mb-3 text-xs font-semibold text-black">Cookie categories</p>
                    <div className="space-y-3">
                      {(
                        [
                          ["necessary", "Essential"],
                          ["analytics", "Analytics"],
                          ["marketing", "Marketing"],
                          ["preferences", "Preferences"],
                        ] as const
                      ).map(([key, fallback]) => (
                        <div key={key} className="grid grid-cols-2 gap-3">
                          <Field
                            label={`${fallback} name`}
                            value={cats[key]?.name ?? ""}
                            maxLength={40}
                            onChange={(v) => setCat(key, "name", v)}
                          />
                          <Field
                            label={`${fallback} description`}
                            value={cats[key]?.description ?? ""}
                            onChange={(v) => setCat(key, "description", v)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Preview ────────────────────────────────────────────────── */}
          <div className="min-w-0 flex-1 overflow-y-auto bg-[#f5f6f8] p-5">
            <ConsentPreview
              iabEnabled={false}
              hideActions
              consentType={consentType}
              langCode={lang}
              siteDomain={siteDomain}
              initialLayout={appearance.layout}
              content={{
                title: content.title,
                message: content.gdpr.message,
                acceptAll: content.acceptAll,
                rejectAll: content.gdpr.rejectAll,
                preferencesLabel: content.preferencesLabel,
                doNotSellLabel: content.ccpa.doNotSellLabel,
                preferenceTitle: content.preferenceTitle,
                preferenceMessage: content.preferenceMessage,
                closeButton: content.closeButton,
                rejectButton: content.rejectButton,
                customizeButton: content.customizeButton,
                cookiePolicyLink: false,
                cookiePolicyLabel: content.cookiePolicyLabel,
                ccpaOptOutTitle: content.ccpa.optOutTitle,
                ccpaOptOutMessage: content.ccpa.optOutMessage,
                ccpaCancelLabel: content.ccpa.cancelLabel,
                saveMyPreferencesLabel: content.gdpr.saveMyPreferencesLabel,
                categories: content.categories,
              }}
            />
          </div>
        </div>

        {/* ── Save bar ─────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-[#e5e5e5] bg-[#fafafa] px-5 py-3">
          <label className="mb-3 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={includeText}
              onChange={(e) => {
                setIncludeText(e.target.checked);
                // Don't strand the user on a tab that just became inert.
                if (!e.target.checked && tab === "Content") setTab("Colors");
              }}
              className="mt-[2px] h-4 w-4 shrink-0 accent-[#007aff]"
            />
            <span className="text-xs text-[#374151]">
              Include banner text
              <span className="ml-1.5 rounded bg-[#eaf2ff] px-1.5 py-0.5 text-[10px] font-medium text-[#0b63ce]">
                {LANGUAGE_OPTIONS.find((l) => l.code === lang)?.label ??
                  lang}
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-[#6b7280]">
                {includeText
                  ? "Applying this template will replace each site's wording and switch it to this language."
                  : "Only colors and layout are saved. Each site keeps its own wording and language."}
              </span>
            </span>
          </label>

          {atLimit && (
            <div className="mb-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2">
              <p className="text-xs text-[#92400e]">
                Both template slots are used — choose one to replace.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {templates.map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-1.5 text-xs text-[#374151]">
                    <input
                      type="radio"
                      name="builder-overwrite"
                      className="h-3.5 w-3.5 accent-[#007aff]"
                      checked={overwriteId === t.id}
                      onChange={() => {
                        setOverwriteId(t.id);
                        if (!name.trim()) setName(t.name);
                      }}
                    />
                    <span className="truncate">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-xs font-medium text-[#374151]">
                Template name
              </span>
              <input
                type="text"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSave();
                }}
                placeholder="e.g. Brand blue — bottom bar"
                className={`h-10 w-full rounded-md border px-3 text-sm text-black outline-none transition ${
                  nameClash ? "border-red-400" : "border-[#e5e5e5] focus:border-[#007aff]"
                }`}
              />
              <span className="mt-1 block text-[11px] text-[#6b7280]">
                {nameClash ? (
                  <span className="text-red-600">A template with this name already exists.</span>
                ) : (
                  `${templates.length} of ${MAX_TEMPLATES} slots used`
                )}
              </span>
            </label>

            <button
              type="button"
              onClick={() => !busy && onClose()}
              disabled={busy}
              className="mb-[18px] h-10 rounded-md border border-[#e5e5e5] bg-white px-4 text-sm text-[#374151] transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave}
              className="mb-[18px] h-10 rounded-md bg-[#007AFF] px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-[#007AFF]"
            >
              {busy ? "Saving…" : isEditing ? "Save changes" : atLimit ? "Replace template" : "Save template"}
            </button>
          </div>

          {error && (
            <div role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
