import Link from "next/link";
import { requireSession } from "@/lib/auth/requireSession";
import { listCustomers, listProjects } from "@/db/repo";
import EmptyState from "@/components/ui/EmptyState";
import { SearchX } from "lucide-react";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const session = await requireSession();
  const query = (q || "").trim();

  const [customers, allProjects] = await Promise.all([
    query ? listCustomers(session.orgId, { search: query, limit: 50 }) : Promise.resolve([]),
    listProjects(session.orgId),
  ]);
  const projects = query ? allProjects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.developer.toLowerCase().includes(query.toLowerCase())) : [];

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <p className="label-text mb-1">Search</p>
      <h1 className="text-2xl md:text-3xl font-display font-semibold mb-8">Results for "{query}"</h1>

      {!query || (customers.length === 0 && projects.length === 0) ? (
        <EmptyState icon={SearchX} title="No results" description="Try a different name, phone number, or project." />
      ) : (
        <div className="flex flex-col gap-8">
          {projects.length > 0 && (
            <div>
              <p className="label-text mb-3">Projects</p>
              <div className="card-surface divide-y divide-brand-border">
                {projects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="block px-4 py-3 hover:bg-brand-cream/40">
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-brand-muted">
                      {p.developer} · {p.location}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {customers.length > 0 && (
            <div>
              <p className="label-text mb-3">Customers</p>
              <div className="card-surface divide-y divide-brand-border">
                {customers.map((c) => (
                  <Link key={c.id} href={`/leads/${c.id}`} className="block px-4 py-3 hover:bg-brand-cream/40">
                    <p className="font-medium text-sm">{c.name || "Unnamed lead"}</p>
                    <p className="text-xs text-brand-muted">{c.phone || c.email || "No contact info"}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
