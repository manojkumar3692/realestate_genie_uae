"use server";

import { requireSession } from "@/lib/auth/requireSession";
import { recordMatchOutcome, generateOutreachForMatch, type RecordOutcomeResult } from "@/db/repoMatching";

export async function updateOutcomeAction(matchId: string, outcomeStatus: string, rawAnswer?: string): Promise<RecordOutcomeResult> {
  const session = await requireSession();
  return recordMatchOutcome(matchId, session.orgId, outcomeStatus, rawAnswer);
}

export async function generateOutreachAction(matchId: string) {
  const session = await requireSession();
  return generateOutreachForMatch(matchId, session.orgId, session.name);
}
