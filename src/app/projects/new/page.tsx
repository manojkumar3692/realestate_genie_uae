import { redirect } from "next/navigation";
import { createDraftProject } from "@/db/repo";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const id = await createDraftProject("Untitled Project");
  redirect(`/projects/${id}`);
}
