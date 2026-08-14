import { notFound } from "next/navigation";
import { getProjectBundle, listReportsForProject } from "@/db/repo";
import ProjectWorkspace from "@/components/workspace/ProjectWorkspace";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = getProjectBundle(id);
  if (!bundle) notFound();

  const reports = listReportsForProject(id).map((r) => ({
    id: r.id,
    clientName: r.clientName,
    createdAt: r.createdAt,
    pdfFileName: r.pdfFileName,
  }));

  return <ProjectWorkspace initialBundle={bundle} savedReports={reports} />;
}
