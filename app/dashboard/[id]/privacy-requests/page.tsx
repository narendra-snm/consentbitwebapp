export const runtime = 'edge';

import { redirect } from 'next/navigation';

// Privacy Requests lives under Legal now. Old links (emails, bookmarks) land here.
export default async function PrivacyRequestsRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/${encodeURIComponent(id)}/legal-policies/privacy-requests`);
}
