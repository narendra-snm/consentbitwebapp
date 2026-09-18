"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readPendingTeamInvite } from "@/lib/pending-team-invite";

/**
 * After a signed-out invitee signs up (signup always lands on /dashboard), send them
 * back to the accept page. The accept page clears the stored token once it reaches a
 * final state, so this cannot loop.
 */
export default function PendingTeamInviteRedirect() {
  const router = useRouter();
  useEffect(() => {
    const token = readPendingTeamInvite();
    if (token) router.replace(`/team/accept?token=${encodeURIComponent(token)}`);
  }, [router]);
  return null;
}
