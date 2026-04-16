
"use client";


export const runtime = 'edge';

import { useParams } from "next/navigation";
import Container from "./components/Container";

export default function page() {
  const params = useParams<{ id: string }>();
  const siteId = params?.id;

  if (!siteId) return null;

  return (
    <div>
      <Container siteId={siteId} />
    </div>
  );
}
  