// Remembers an invite token across sign-in / sign-up.
//
// The accept page stores the token before sending a signed-out invitee to /login or
// /signup. Login honours ?next=, but signup (and email-verification flows) always land
// on /dashboard, so the dashboard reads this and sends the user back to accept.
// localStorage (not sessionStorage) because signup can continue in a new tab from email.

const KEY = "cbPendingTeamInvite";
const TTL_MS = 24 * 60 * 60 * 1000;

export function savePendingTeamInvite(token: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, ts: Date.now() }));
  } catch { /* storage unavailable */ }
}

export function readPendingTeamInvite(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string; ts?: number };
    if (!parsed?.token || !parsed.ts || Date.now() - parsed.ts > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed.token;
  } catch {
    return null;
  }
}

export function clearPendingTeamInvite() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* storage unavailable */ }
}
