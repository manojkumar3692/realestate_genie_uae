import Link from "next/link";
import { Sparkles, FolderKanban } from "lucide-react";
import { requireSession } from "@/lib/auth/requireSession";
import { listProjects } from "@/db/repo";
import { getMatchCounts } from "@/db/repoMatching";
import { formatMoney } from "@/lib/normalize/budget";
import EmptyState from "@/components/ui/EmptyState";

export default async function ProjectsPage() {
  const session = await requireSession();
  const projects = await listProjects(session.orgId);
  const countsByProject = new Map(await Promise.all(projects.map(async (p) => [p.id, await getMatchCounts(p.id)] as const)));

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="label-text mb-1">Projects</p>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">{projects.length} project{projects.length === 1 ? "" : "s"}</h1>
        </div>
        <Link href="/projects/new" className="btn-accent flex items-center gap-2">
          <Sparkles size={15} /> Add Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Add your first project to discover buyers"
          description="Add a new launch or listing and we'll surface which historical customers are worth contacting again."
          actionHref="/projects/new"
          actionLabel="Add Project"
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((p) => {
            const counts = countsByProject.get(p.id) ?? { hot: 0, warm: 0, possible: 0 };
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="card-surface-interactive p-5 flex flex-col gap-3">
                <div>
                  <h3 className="font-display font-semibold">{p.name}</h3>
                  <p className="text-sm text-brand-muted">
                    {p.developer} · {p.location}
                  </p>
                </div>
                <p className="text-sm">
                  From <span className="font-semibold">{formatMoney(p.startingPrice, p.currency)}</span> · {p.constructionStatus.replace("_", "-")}
                </p>
                {(counts.hot || counts.warm || counts.possible) > 0 && (
                  <div className="flex gap-2 text-xs font-semibold">
                    <span className="badge badge-hot">{counts.hot} Hot</span>
                    <span className="badge badge-warm">{counts.warm} Warm</span>
                    <span className="badge badge-possible">{counts.possible} Possible</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
