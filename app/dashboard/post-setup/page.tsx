
import { Suspense } from "react";
import { PostSetupClient } from "./PostSetupClient";
import LoadingScreen from "../animation/components/LoadingScreen";

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
