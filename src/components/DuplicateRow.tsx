"use client";

import { useTransition } from "react";
import { resolveDuplicateAction } from "@/app/(app)/leads/duplicates/actions";

interface CustomerLite {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export default function DuplicateRow({
  candidateId,
  confidenceLevel,
  matchType,
  a,
  b,
}: {
  candidateId: string;
  confidenceLevel: string;
  matchType: string;
  a: CustomerLite;
  b: CustomerLite;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card-surface p-4 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1 grid grid-cols-2 gap-4">
        <CustomerCell customer={a} />
        <CustomerCell customer={b} />
      </div>
      <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-brand-cream text-brand-muted capitalize">
          {confidenceLevel} · {matchType.replace(/_/g, " ")}
        </span>
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={() => startTransition(() => resolveDuplicateAction(candidateId, "reject"))}
            className="btn-secondary btn-sm"
          >
            Not a duplicate
          </button>
          <button
            disabled={isPending}
            onClick={() => startTransition(() => resolveDuplicateAction(candidateId, "merge"))}
            className="btn-primary btn-sm"
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerCell({ customer }: { customer: CustomerLite }) {
  return (
    <div>
      <p className="font-medium text-sm">{customer.name || "Unnamed"}</p>
      <p className="text-xs text-brand-muted">{customer.phone || customer.email || "No contact info"}</p>
    </div>
  );
}
