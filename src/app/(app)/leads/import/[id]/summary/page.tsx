import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Users, Copy, Phone, Brain, MapPin, FileText, AlertTriangle } from "lucide-react";
import { requireSession } from "@/lib/auth/requireSession";
import { getImportJob, getPendingDuplicateCandidates } from "@/db/repo";
import StatTile from "@/components/ui/StatTile";

export default async function ImportSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const job = await getImportJob(id, session.orgId);
  if (!job) notFound();

  const stats = job.statsJson as Record<string, number>;
  const pendingDuplicates = await getPendingDuplicateCandidates(session.orgId);

  if (job.status !== "completed") {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 text-center">
        <p className="text-brand-muted">This import is still processing ({job.progressJson.stage}). Refresh in a moment.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-center gap-2 text-brand-positive mb-2">
        <CheckCircle2 size={20} />
        <p className="label-text mb-0 text-brand-positive">Import Complete</p>
      </div>
      <h1 className="text-2xl md:text-3xl font-display font-semibold mb-2">Data quality report — "{job.fileName}"</h1>
      <p className="text-brand-muted text-sm mb-8">Here's exactly what we understood from your file. Nothing was silently discarded.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatTile label="Rows Imported" value={(stats.totalRows ?? 0).toLocaleString()} icon={FileText} />
        <StatTile label="Unique Customers" value={(stats.uniqueCustomers ?? 0).toLocaleString()} icon={Users} />
        <StatTile label="Confirmed Duplicates Merged" value={(stats.confirmedDuplicatesMerged ?? 0).toLocaleString()} icon={Copy} />
        <StatTile label="Possible Duplicates to Review" value={(stats.possibleDuplicateGroups ?? 0).toLocaleString()} icon={AlertTriangle} />
        <StatTile label="With Phone Numbers" value={(stats.withPhone ?? 0).toLocaleString()} icon={Phone} />
        <StatTile label="With Usable Buyer Intent" value={(stats.withUsableIntent ?? 0).toLocaleString()} icon={Brain} />
        <StatTile label="With Location Preference" value={(stats.withLocation ?? 0).toLocaleString()} icon={MapPin} />
        <StatTile label="Insufficient Data" value={(stats.insufficientData ?? 0).toLocaleString()} />
      </div>

      {pendingDuplicates.length > 0 && (
        <div className="card-surface p-5 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{pendingDuplicates.length} possible duplicate group(s) need review</p>
            <p className="text-sm text-brand-muted">We only auto-merge exact phone/email matches — everything else is left for you to confirm.</p>
          </div>
          <Link href="/leads/duplicates" className="btn-secondary shrink-0">
            Review Duplicates
          </Link>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/leads" className="btn-accent">
          View Customer Intelligence
        </Link>
        <Link href="/projects/new" className="btn-secondary">
          Add a Project to Match Against
        </Link>
      </div>
    </div>
  );
}
