export const runtime = 'edge';

import { redirect } from 'next/navigation';

// The privacy policy wizard moved under Legal Policies. Old links (emails, bookmarks) land here.
export default async function PrivacyPolicyRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/${encodeURIComponent(id)}/legal-policies/privacy-policy`);
}
