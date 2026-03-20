"use client";

import { useParams } from "next/navigation";

export default function ScanPage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="max-w-[1148px] mx-auto pb-10">
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-black">Scan</h2>
        <p className="text-sm text-gray-600 mt-2">
          Site: <span className="font-medium text-black">{params?.id}</span>
        </p>
        <p className="text-sm text-gray-600 mt-4">
          Next step: trigger `/api/scan-site` and show cookie/script results here.
        </p>
      </div>
    </div>
  );
}

