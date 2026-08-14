import { redirect } from "next/navigation";
import { createDraftProject } from "@/db/repo";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  const id = createDraftProject("Untitled Project");
  redirect(`/projects/${id}`);
}
