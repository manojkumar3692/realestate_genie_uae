import { requireSession } from "@/lib/auth/requireSession";
import { getPendingDuplicateCandidates } from "@/db/repo";
import { db } from "@/db/client";
import { customers } from "@/db/schema";
import { inArray } from "drizzle-orm";
import DuplicateRow from "@/components/DuplicateRow";
import EmptyState from "@/components/ui/EmptyState";
import { ShieldCheck } from "lucide-react";

export default async function DuplicatesPage() {
  const session = await requireSession();
  const candidates = await getPendingDuplicateCandidates(session.orgId);

  const customerIds = Array.from(new Set(candidates.flatMap((c) => [c.customerAId, c.customerBId])));
  const people = customerIds.length ? await db.query.customers.findMany({ where: inArray(customers.id, customerIds) }) : [];
  const byId = new Map(people.map((p) => [p.id, p]));

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <p className="label-text mb-1">Data Quality</p>
      <h1 className="text-2xl md:text-3xl font-display font-semibold mb-2">Possible duplicates</h1>
      <p className="text-brand-muted text-sm mb-8">
        We only auto-merge exact phone or email matches. Everything below is a "probable" or "possible" match based on
        similar names and partial phone numbers — review and decide.
      </p>

      {candidates.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No duplicates waiting for review" description="Every remaining record in your database is either unique or already confirmed." />
      ) : (
        <div className="flex flex-col gap-3">
          {candidates.map((c) => {
            const a = byId.get(c.customerAId);
            const b = byId.get(c.customerBId);
            if (!a || !b) return null;
            return <DuplicateRow key={c.id} candidateId={c.id} confidenceLevel={c.confidenceLevel} matchType={c.matchType} a={a} b={b} />;
          })}
        </div>
      )}
    </div>
  );
}
