import { Suspense } from 'react';
import type { Metadata } from 'next';
import SupportForm from '@/components/support/SupportForm';

// Standalone support form — intentionally not linked from the dashboard.
export const metadata: Metadata = {
  title: 'Contact support · ConsentBit',
  robots: { index: false, follow: false },
};

export default function SupportPage() {
  return (
    <Suspense fallback={null}>
      <SupportForm />
    </Suspense>
  );
}
