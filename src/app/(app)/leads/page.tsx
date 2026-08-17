import Link from "next/link";
import { Search, Users, UploadCloud } from "lucide-react";
import { requireSession } from "@/lib/auth/requireSession";
import { listCustomers, countCustomers } from "@/db/repo";
import { formatMoney } from "@/lib/normalize/budget";
import EmptyState from "@/components/ui/EmptyState";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const session = await requireSession();
  const [customers, total] = await Promise.all([
    listCustomers(session.orgId, { search: q, limit: 200 }),
    countCustomers(session.orgId),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="label-text mb-1">Customer Intelligence</p>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">{total.toLocaleString()} customers</h1>
        </div>
        <form className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input name="q" defaultValue={q} placeholder="Search name or phone…" className="input-field pl-8 w-64" />
        </form>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={UploadCloud}
          title="Import your historical CRM export"
          description="CSV and Excel files from any CRM are accepted."
          actionHref="/leads/import"
          actionLabel="Import Leads"
        />
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers match that search" description="Try a different name or phone number." />
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-brand-cream text-brand-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Phone</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-brand-cream/40">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${c.id}`} className="font-medium hover:text-brand-primary">
                      {c.name || "Unnamed lead"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-brand-muted">{c.phone || "—"}</td>
                  <td className="px-4 py-3 capitalize text-brand-muted">{c.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-brand-muted">{new Date(c.latestSeenAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden divide-y divide-brand-border">
            {customers.map((c) => (
              <Link key={c.id} href={`/leads/${c.id}`} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="font-medium text-sm">{c.name || "Unnamed lead"}</p>
                  <p className="text-xs text-brand-muted">{c.phone || "No phone"}</p>
                </div>
                <span className="text-xs text-brand-muted capitalize">{c.status.replace(/_/g, " ")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
