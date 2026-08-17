"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/requireSession";
import { resolveDuplicateCandidate } from "@/db/repo";

export async function resolveDuplicateAction(id: string, action: "merge" | "reject") {
  const session = await requireSession();
  await resolveDuplicateCandidate(id, session.orgId, action);
  revalidatePath("/leads/duplicates");
}
