"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MAX_TEMPLATES,
  applyTemplateToSites,
  deleteTemplate,
  listTemplates,
  type ApplyResult,
  type BannerTemplate,
} from "./bannerTemplates";
import { LANGUAGE_OPTIONS } from "./translations";

/**
 * Templates tab — the two saved slots, with Create / Edit / Apply / Apply to sites / Delete.
 *
 * Applying to the current site touches local editor state only; it is not persisted until
 * the user hits Publish, which keeps a mis-click recoverable by walking away. Applying to
 * *other* sites saves and goes live immediately — there is no draft state in this system,
 * and the CDN serves the row with no-store — so those aren't open in an editor to review
 * first, hence the separate, explicitly-confirmed action.
 */

/**
 * The human-readable language of a template's stored text, or null when it carries no
 * text at all. Read from the payload rather than a column so it stays true even for
 * templates saved before the include-text toggle existed.
 */
function templateTextLanguage(t: BannerTemplate): string | null {
  const en = (t.payload as any)?.translations?.en;
  if (!en || typeof en !== "object" || Object.keys(en).length === 0) return null;
  const code = typeof en.languageSelected === "string" ? en.languageSelected : "en";
  return LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? code;
}

function SwatchRow({ payload }: { payload: Record<string, any> | null }) {
  if (!payload) return null;
  const swatches = [
    payload.backgroundColor,
    payload.headingColor,
    payload.textColor,
    payload.acceptButtonBg,
    payload.customiseButtonBg,
  ].filter(Boolean) as string[];

  return (
    <div className="flex items-center gap-1">
      {swatches.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="h-4 w-4 rounded border border-black/10"
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  );
}

export default function TemplatesPanel({
  organizationId,
  currentSiteId,
  sites,
  onApplyToCurrentSite,
  onCreateTemplate,
  onEditTemplate,
  refreshKey = 0,
}: {
  organizationId?: string | null;
  currentSiteId?: string | null;
  /** Every site in the org, for the bulk-apply picker. */
  sites: Array<{ id: string | number; domain?: string | null; name?: string | null }>;
  onApplyToCurrentSite: (payload: Record<string, any>) => void;
  /**
   * Open the save dialog. Deliberately the *same* dialog the icon button beside Publish
   * Changes opens, rather than a second create form — one code path means the slot cap,
   * the overwrite flow and the payload snapshot can't drift between two entry points.
   */
  onCreateTemplate?: () => void;
  /** Reopen the builder loaded with this saved template, saving back to the same slot. */
  onEditTemplate?: (template: BannerTemplate) => void;
  /** Bumped by the parent after a save so the list reloads without a tab switch. */
  refreshKey?: number;
}) {
  const [templates, setTemplates] = useState<BannerTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulk-apply state
  const [pickerFor, setPickerFor] = useState<BannerTemplate | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ApplyResult[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setTemplates(await listTemplates(organizationId));
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    void load();
    // refreshKey is in the deps so a save from the dialog reloads the list in place.
  }, [load, refreshKey]);

  async function handleDelete(t: BannerTemplate) {
    if (!window.confirm(`Delete the template “${t.name}”? This can't be undone.`)) return;
    const ok = await deleteTemplate(t.id, organizationId);
    if (ok) void load();
  }

  function openPicker(t: BannerTemplate) {
    setPickerFor(t);
    setSelected(new Set());
    setResults(null);
    setProgress({ done: 0, total: 0 });
  }

  async function runBulkApply() {
    if (!pickerFor?.payload || selected.size === 0) return;
    setApplying(true);
    setResults(null);
    const ids = Array.from(selected);
    setProgress({ done: 0, total: ids.length });

    const res = await applyTemplateToSites(pickerFor.payload, ids, (done, total) =>
      setProgress({ done, total }),
    );

    setApplying(false);
    setResults(res);
  }

  const otherSites = sites.filter((s) => String(s.id) !== String(currentSiteId));

  const atLimit = templates.length >= MAX_TEMPLATES;

  return (
    <div className="p-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-black">Banner templates</p>
          <p className="mt-1 text-xs leading-relaxed text-[#6b7280]">
            A template stores this banner&rsquo;s{" "}
            <strong className="font-medium text-[#374151]">colors and layout</strong>, and
            optionally its text. The privacy policy URL and the regulation type always stay
            specific to each site.
          </p>
        </div>
        {onCreateTemplate && (
          <button
            type="button"
            onClick={onCreateTemplate}
            title={
              atLimit
                ? `Both slots are used — you'll be asked which template to replace.`
                : "Save this banner's design as a reusable template"
            }
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[#007AFF] px-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M7 2.5V11.5M2.5 7H11.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Create template
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <div className="h-[86px] animate-pulse rounded-lg bg-[#f3f4f6]" />
          <div className="h-[86px] animate-pulse rounded-lg bg-[#f3f4f6]" />
        </div>
      ) : templates.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-[#d1d5db] bg-[#f9fafb] p-6 text-center">
          <p className="text-sm text-[#374151]">No templates saved yet</p>
          <p className="mt-1 text-xs text-[#6b7280]">
            Style this banner the way you want it, then create a template to reuse that
            look on your other sites.
          </p>
          {onCreateTemplate && (
            <button
              type="button"
              onClick={onCreateTemplate}
              className="mt-3 h-9 rounded-md bg-[#007AFF] px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create template
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border border-[#e5e5e5] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-black">{t.name}</p>
                  {/* What the template actually carries. Worth showing on the card because
                      the apply buttons sit right below it, and "does this overwrite my
                      wording?" is the one thing you can't tell from the swatches. */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
                      Colors &amp; layout
                    </span>
                    {templateTextLanguage(t) ? (
                      <span className="rounded bg-[#eaf2ff] px-1.5 py-0.5 text-[10px] font-medium text-[#0b63ce]">
                        Text · {templateTextLanguage(t)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <SwatchRow payload={t.payload} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {onEditTemplate && (
                    <button
                      type="button"
                      onClick={() => onEditTemplate(t)}
                      className="rounded-md border border-[#e5e5e5] px-2.5 py-1 text-xs text-[#374151] transition hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDelete(t)}
                    className="rounded-md border border-[#e5e5e5] px-2.5 py-1 text-xs text-[#6b7280] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#f0f0f0] pt-3">
                <button
                  type="button"
                  disabled={!t.payload}
                  onClick={() => t.payload && onApplyToCurrentSite(t.payload)}
                  className="h-8 rounded-md bg-[#007AFF] px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  Apply to this site
                </button>
                <button
                  type="button"
                  disabled={!t.payload || otherSites.length === 0}
                  onClick={() => openPicker(t)}
                  className="h-8 rounded-md border border-[#e5e5e5] px-3 text-xs text-[#374151] transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Apply to other sites…
                </button>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-[#6b7280]">
            {templates.length} of {MAX_TEMPLATES} slots used
          </p>
        </div>
      )}

      {/* Applying here only changes the editor — Publish still has to be pressed. Saying so
          avoids the "I applied it but the live banner didn't change" support ticket. */}
      {templates.length > 0 && (
        <p className="mt-4 text-[11px] leading-relaxed text-[#6b7280]">
          Applying to this site updates the editor and preview only — press{" "}
          <span className="font-medium">Publish Changes</span> to push it live. Applying to
          other sites saves and publishes them straight away.
        </p>
      )}

      {/* ── Bulk apply picker ─────────────────────────────────────────────── */}
      {pickerFor && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => !applying && setPickerFor(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 flex max-h-[80vh] w-[480px] max-w-[calc(100vw-32px)] flex-col rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-black">
              Apply &ldquo;{pickerFor.name}&rdquo; to sites
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#6b7280]">
              Overwrites the colors, layout and text on each selected site and publishes the
              change. Their privacy policy URL and regulation type are left alone.
            </p>

            {results ? (
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                <p className="text-sm font-medium text-black">
                  {results.filter((r) => r.ok).length} of {results.length} sites updated
                </p>
                <div className="mt-2 space-y-1.5">
                  {results.map((r) => {
                    const site = sites.find((s) => String(s.id) === r.siteId);
                    return (
                      <div key={r.siteId} className="flex items-start gap-2 text-xs">
                        <span className={r.ok ? "text-green-600" : "text-red-600"}>
                          {r.ok ? "✓" : "✕"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[#374151]">
                          {site?.domain || site?.name || r.siteId}
                          {!r.ok && r.error ? (
                            <span className="text-red-600"> — {r.error}</span>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-[#e5e5e5]">
                {otherSites.map((s) => {
                  const id = String(s.id);
                  return (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-2.5 border-b border-[#f0f0f0] px-3 py-2.5 last:border-b-0 hover:bg-[#f9fafb]"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#007aff]"
                        checked={selected.has(id)}
                        disabled={applying}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(id);
                            else next.delete(id);
                            return next;
                          });
                        }}
                      />
                      <span className="truncate text-sm text-[#374151]">
                        {s.domain || s.name || id}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {applying && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                  <div
                    className="h-full bg-[#007AFF] transition-all"
                    style={{
                      width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#6b7280]">
                  Updating {progress.done} of {progress.total}…
                </p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={applying}
                onClick={() => setPickerFor(null)}
                className="h-9 rounded-md border border-[#e5e5e5] px-4 text-sm text-[#374151] transition hover:bg-gray-50 disabled:opacity-50"
              >
                {results ? "Close" : "Cancel"}
              </button>
              {!results && (
                <button
                  type="button"
                  disabled={applying || selected.size === 0}
                  onClick={() => void runBulkApply()}
                  className="h-9 rounded-md bg-[#007AFF] px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {applying
                    ? "Applying…"
                    : `Apply to ${selected.size} site${selected.size === 1 ? "" : "s"}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
