"use client";

import { useParams } from "next/navigation";

export default function ConsentLogsPage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="max-w-[1148px] mx-auto pb-10">
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-black">Consent Logs</h2>
        <p className="text-sm text-gray-600 mt-2">
          Site: <span className="font-medium text-black">{params?.id}</span>
        </p>
        <p className="text-sm text-gray-600 mt-4">
          Next step: wire this page to the backend `/api/consent-logs` for this site.
        </p>
      </div>
    </div>
  );
}

