import { listProjects } from "@/db/repo";
import { getFirmSettings } from "@/db/repo";
import DashboardView from "@/components/DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [projects, firm] = await Promise.all([listProjects(), getFirmSettings()]);

  const stats = {
    totalProjects: projects.length,
    totalUnitTypes: projects.reduce((s, p) => s + p.unitTypeCount, 0),
    totalReports: projects.reduce((s, p) => s + p.reportCount, 0),
  };

  return <DashboardView projects={projects} firm={firm} stats={stats} />;
}
