export const runtime = 'edge';
import { Suspense } from "react";
import { PostSetupClient } from "./PostSetupClient";

export default function PostSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#E6F1FD] flex items-center justify-center">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 text-sm text-gray-700">
            Loading…
          </div>
        </div>
      }
    >
      <PostSetupClient />
    </Suspense>
  );
}
