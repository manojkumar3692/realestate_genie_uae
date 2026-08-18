"use server";

import { requireSession } from "@/lib/auth/requireSession";
import { recordMatchOutcome, type RecordOutcomeResult } from "@/db/repoMatching";

export async function logTodayOutcomeAction(matchId: string, outcomeStatus: string, rawAnswer?: string): Promise<RecordOutcomeResult> {
  const session = await requireSession();
  return recordMatchOutcome(matchId, session.orgId, outcomeStatus, rawAnswer);
}
