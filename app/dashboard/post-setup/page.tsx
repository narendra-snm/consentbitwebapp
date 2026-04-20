export const runtime = 'edge';
import { Suspense } from "react";
import { PostSetupClient } from "./PostSetupClient";
import LoadingScreen from "@/components/animations//LoadingScreen";

export default function PostSetupPage() {
  return (
    <Suspense
      fallback={
        <LoadingScreen/>
      }
    >
      <PostSetupClient />
    </Suspense>
  );
}
