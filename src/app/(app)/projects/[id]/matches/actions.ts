"use server";

import { requireSession } from "@/lib/auth/requireSession";
import { updateMatchOutcome } from "@/db/repoMatching";
import { generateOutreachForMatch } from "@/db/repoMatching";

export async function updateOutcomeAction(matchId: string, outcomeStatus: string): Promise<void> {
  const session = await requireSession();
  await updateMatchOutcome(matchId, session.orgId, outcomeStatus);
}

export async function generateOutreachAction(matchId: string) {
  const session = await requireSession();
  return generateOutreachForMatch(matchId, session.orgId, session.name);
}
