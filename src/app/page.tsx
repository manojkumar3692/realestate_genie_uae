import Link from "next/link";
import { listProjects } from "@/db/repo";
import { formatMoney } from "@/lib/calculations";
import { Building2, FileText, MapPin, Plus, Sparkles } from "lucide-react";
import NewProjectButton from "@/components/NewProjectButton";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const projects = listProjects();

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-primary">Your Projects</h1>
          <p className="text-brand-muted text-sm mt-1">
            Build investor-ready PDFs for every project you list — in minutes.
          </p>
        </div>
        <NewProjectButton />
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card-surface p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all block"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="w-10 h-10 rounded-lg bg-brand-cream flex items-center justify-center">
                  <Building2 size={18} className="text-brand-primary" />
                </span>
                <StatusPill status={p.status} />
              </div>
              <h3 className="font-semibold text-[15px] text-foreground mb-1 line-clamp-1">
                {p.name || "Untitled Project"}
              </h3>
              <div className="flex items-center gap-1 text-xs text-brand-muted mb-3">
                <MapPin size={12} />
                {p.area || "Location not set"}
              </div>

              {p.unitTypeCount > 0 ? (
                <div className="text-sm text-foreground mb-3">
                  {p.priceFrom ? (
                    <span className="font-semibold">
                      From {formatMoney(p.priceFrom, p.currency)}
                    </span>
                  ) : (
                    <span className="text-brand-muted">Pricing not set</span>
                  )}
                  <span className="text-brand-muted"> · {p.unitTypeCount} unit type{p.unitTypeCount > 1 ? "s" : ""}</span>
                </div>
              ) : (
                <div className="text-sm text-brand-muted mb-3">No unit types added yet</div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-brand-border text-xs text-brand-muted">
                <span className="flex items-center gap-1">
                  <FileText size={12} /> {p.reportCount} PDF{p.reportCount === 1 ? "" : "s"} generated
                </span>
                <span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = {
    off_plan: "Off-Plan",
    ready: "Ready",
    secondary: "Secondary",
  };
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide bg-brand-cream text-brand-primary px-2 py-1 rounded-full">
      {labels[status] ?? status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="card-surface p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-brand-cream flex items-center justify-center mx-auto mb-4">
        <Sparkles size={24} className="text-brand-accent" />
      </div>
      <h3 className="font-semibold text-lg mb-1.5">Create your first investment PDF</h3>
      <p className="text-brand-muted text-sm max-w-sm mx-auto mb-6">
        Add a project, answer a few guided questions, and generate a premium PDF that convinces
        your clients to invest — in minutes.
      </p>
      <NewProjectButton large />
    </div>
  );
}
