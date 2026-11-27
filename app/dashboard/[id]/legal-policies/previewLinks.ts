// The policy preview is a sandboxed srcDoc iframe. Clicking an external link
// there navigates the iframe itself, and most sites (e.g. *.webflow.io) refuse
// to be framed ("refused to connect"). Rewrite absolute links so they open in
// a new tab instead; in-page "#anchor" links are left alone.
export function previewSrcDoc(html: string): string {
  if (!html || typeof window === 'undefined' || typeof DOMParser === 'undefined') return html;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('a[href]').forEach((a) => {
      const href = (a.getAttribute('href') || '').trim();
      if (/^(https?:|mailto:|tel:|\/\/)/i.test(href)) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });
    return '<!doctype html>' + doc.documentElement.outerHTML;
  } catch {
    return html;
  }
}

// Section titles exactly as the worker generated them: the numbered <h2>s
// ("11. Visitors in the EU and UK"). Returns null when there is no preview yet,
// so callers can fall back to their own estimate.
export function previewSections(html: string | null): string[] | null {
  if (!html || typeof DOMParser === 'undefined') return null;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const titles: string[] = [];
    doc.querySelectorAll('h2').forEach((h) => {
      const m = (h.textContent || '').trim().match(/^\d+\.\s+(.+)$/);
      if (m) titles.push(m[1]);
    });
    return titles.length ? titles : null;
  } catch {
    return null;
  }
}

// Scripts stay blocked; only popups (new tabs from target=_blank) are allowed.
export const PREVIEW_SANDBOX = 'allow-popups allow-popups-to-escape-sandbox';
