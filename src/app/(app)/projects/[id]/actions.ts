"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/requireSession";
import { runMatchingForProject } from "@/db/repoMatching";

export async function runMatchingAction(projectId: string, _formData: FormData): Promise<void> {
  const session = await requireSession();
  await runMatchingForProject(projectId, session.orgId, session.sub);
  redirect(`/projects/${projectId}/matches`);
}
