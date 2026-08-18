"use server";

import { requireSession } from "@/lib/auth/requireSession";
import { recordMatchOutcome, ensureMatchRow, type RecordOutcomeResult } from "@/db/repoMatching";

/** OutcomeButtons on the buyer profile's reverse-match list ("Best Current Options", product
 *  spec §10) always calls this with a "customerId::projectId" composite key, never a bare
 *  matchId — those scores are computed live without persisting (see
 *  getBestProjectMatchesForCustomer), so there may be no projectMatches row yet for a project
 *  shown there. ensureMatchRow finds the existing row or creates it on the spot before handing
 *  off to the same recordMatchOutcome every other outcome-logging surface uses. */
export async function logBuyerProjectOutcomeAction(idKey: string, outcomeStatus: string, rawAnswer?: string): Promise<RecordOutcomeResult> {
  const session = await requireSession();
  const [customerId, projectId] = idKey.split("::");
  if (!customerId || !projectId) return { outcomeStatus, rescored: false };
  const matchId = await ensureMatchRow(customerId, projectId, session.orgId);
  if (!matchId) return { outcomeStatus, rescored: false };
  return recordMatchOutcome(matchId, session.orgId, outcomeStatus, rawAnswer);
}
