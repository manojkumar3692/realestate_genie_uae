import Link from "next/link";
import { Users, Copy, Brain, FolderKanban, Flame, UploadCloud, Sparkles, ArrowRight } from "lucide-react";
import { requireSession } from "@/lib/auth/requireSession";
import { getDashboardStats } from "@/db/repo";
import StatTile from "@/components/ui/StatTile";
import EmptyState from "@/components/ui/EmptyState";

export default async function DashboardPage() {
  const session = await requireSession();
  const stats = await getDashboardStats(session.orgId);
  const hasData = stats.totalLeadsImported > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="label-text mb-1">Buyer Intelligence</p>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">Welcome back, {session.name.split(" ")[0] || "there"}</h1>
          <p className="text-brand-muted text-sm mt-1">
            Your old leads, understood. Upload a new project and we'll tell you who's worth calling again.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/leads/import" className="btn-secondary flex items-center gap-2">
            <UploadCloud size={15} /> Import Leads
          </Link>
          <Link href="/projects/new" className="btn-accent flex items-center gap-2">
            <Sparkles size={15} /> Add Project
          </Link>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon={UploadCloud}
          title="Import your historical CRM export"
          description="CSV and Excel files from any CRM are accepted — we'll figure out the columns for you. No fixed template needed."
          actionHref="/leads/import"
          actionLabel="Import Leads"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile label="Leads Imported" value={stats.totalLeadsImported.toLocaleString()} icon={UploadCloud} />
          <StatTile label="Unique Customers" value={stats.uniqueCustomers.toLocaleString()} icon={Users} />
          <StatTile label="Duplicates Merged" value={stats.duplicatesMerged.toLocaleString()} icon={Copy} />
          <StatTile label="Usable Buyer Intent" value={stats.usableBuyerIntent.toLocaleString()} icon={Brain} />
          <StatTile label="Projects Analyzed" value={stats.projectsAnalyzed.toLocaleString()} icon={FolderKanban} />
          <StatTile label="High-Match Opportunities" value={stats.highMatchOpportunities.toLocaleString()} icon={Flame} accent />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <QuickLink href="/leads" title="Customer Intelligence" description="Browse every historical lead and their AI-inferred buyer profile." />
        <QuickLink href="/projects" title="Projects" description="View past projects and their match results, or add a new launch." />
        <QuickLink href="/contact-today" title="Who Should I Contact?" description="Today's best reactivation opportunities across every active project." />
      </div>

      {hasData && stats.recentProjects.length > 0 && (
        <div>
          <h2 className="text-lg font-display font-semibold mb-3">Recently Analyzed Projects</h2>
          <div className="card-surface divide-y divide-brand-border">
            {stats.recentProjects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-brand-cream/50 transition-colors">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-brand-muted">
                    {p.developer} · {p.location}
                  </p>
                </div>
                <ArrowRight size={16} className="text-brand-muted" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="card-surface-interactive p-5 flex flex-col gap-1.5">
      <h3 className="font-display font-semibold">{title}</h3>
      <p className="text-sm text-brand-muted">{description}</p>
    </Link>
  );
}
