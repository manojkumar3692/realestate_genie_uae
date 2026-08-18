import { notFound } from "next/navigation";
import { Phone, Mail, Globe, Clock, Sparkles } from "lucide-react";
import { requireSession } from "@/lib/auth/requireSession";
import { getCustomerDetail } from "@/db/repo";
import { getBestProjectMatchesForCustomer } from "@/db/repoMatching";
import { formatMoney } from "@/lib/normalize/budget";
import BestOptions from "./BestOptions";
import type * as schema from "@/db/schema";

type PreferencesRow = typeof schema.customerPreferences.$inferSelect;
type InferencesRow = typeof schema.customerInferences.$inferSelect;

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const detail = await getCustomerDetail(id, session.orgId);
  if (!detail) notFound();

  const { customer, preferences, inferences, interactions, sourceRecords } = detail;
  const sources = Array.from(new Set(sourceRecords.map((s) => s.rawSourceText).filter(Boolean)));
  const bestMatches = await getBestProjectMatchesForCustomer(customer.id, session.orgId);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-text mb-1">Customer Intelligence</p>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">{customer.name || "Unnamed lead"}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-brand-muted">
            {customer.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={13} /> {customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1.5">
                <Mail size={13} /> {customer.email}
              </span>
            )}
            {customer.nationality && (
              <span className="flex items-center gap-1.5">
                <Globe size={13} /> {customer.nationality}
              </span>
            )}
          </div>
        </div>
        <span className="badge bg-brand-cream text-brand-muted capitalize shrink-0">{customer.status.replace(/_/g, " ")}</span>
      </div>

      {inferences?.aiSummary && (
        <div className="card-surface p-5 bg-gradient-to-br from-white to-brand-cream/40">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={15} className="text-brand-accent-dark" />
            <p className="label-text mb-0">AI Summary</p>
          </div>
          <p className="text-sm leading-relaxed">{inferences.aiSummary}</p>
        </div>
      )}

      <BestOptions matches={bestMatches} />

      <div className="grid md:grid-cols-2 gap-4">
        <ProfileCard title="Current Buyer Profile" fields={buildProfileFields(preferences, inferences)} />
        <ProfileCard
          title="Source & Campaign History"
          fields={[
            { label: "Original sources", value: sources.join(", ") || "Unknown" },
            { label: "Previous status", value: preferences?.previousStatus || "—" },
            { label: "Lost reason", value: preferences?.lostReason || "—" },
            { label: "Last contacted", value: preferences?.lastContactedAt ? new Date(preferences.lastContactedAt).toLocaleDateString() : "Never recorded" },
          ]}
        />
      </div>

      {inferences?.evidenceJson && inferences.evidenceJson.length > 0 && (
        <div className="card-surface p-5">
          <p className="label-text mb-3">Why the system believes this</p>
          <div className="flex flex-col gap-2.5">
            {inferences.evidenceJson.map((e, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-positive-tint text-brand-positive shrink-0 mt-0.5">
                  {Math.round(e.confidence * 100)}%
                </span>
                <div>
                  <p>
                    <span className="font-medium">{e.field}:</span> {e.value}
                  </p>
                  <p className="text-xs text-brand-muted italic">"{e.sourceExcerpt}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="label-text mb-3">Timeline</p>
        <div className="flex flex-col gap-3">
          {interactions.length === 0 && <p className="text-sm text-brand-muted">No recorded activity yet.</p>}
          {interactions.map((i) => (
            <div key={i.id} className="card-surface p-4 flex gap-3">
              <span className="text-brand-muted shrink-0 pt-0.5">
                <Clock size={14} />
              </span>
              <div>
                <p className="text-xs text-brand-muted">{new Date(i.occurredAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })}</p>
                <p className="text-sm font-medium">{i.summary}</p>
                {i.rawNote && <p className="text-sm text-brand-muted mt-1">"{i.rawNote}"</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildProfileFields(preferences: PreferencesRow | undefined, inferences: InferencesRow | undefined) {
  const budgetMin = inferences?.inferredBudgetMin ?? preferences?.budgetMin;
  const budgetMax = inferences?.inferredBudgetMax ?? preferences?.budgetMax;
  const locations = inferences?.inferredLocations?.length ? inferences.inferredLocations : preferences?.preferredLocations ?? [];
  const bedrooms = inferences?.inferredBedrooms?.length ? inferences.inferredBedrooms : preferences?.bedrooms ?? [];
  const purpose = inferences?.inferredPurpose ?? preferences?.purpose ?? "unclear";
  const readiness = inferences?.inferredPurchaseReadiness ?? preferences?.purchaseReadiness ?? "unknown";
  const objections = inferences?.inferredObjections?.length ? inferences.inferredObjections.join(", ") : preferences?.lostReason || "—";
  return [
    { label: "Budget", value: budgetMin || budgetMax ? `${formatMoney(budgetMin, preferences?.budgetCurrency)} - ${formatMoney(budgetMax, preferences?.budgetCurrency)}` : "Unknown" },
    { label: "Preferred locations", value: locations.join(", ") || "Unknown" },
    { label: "Unit preference", value: bedrooms.join(", ") || "Unknown" },
    { label: "Investment / end-use", value: purpose.replace(/_/g, " ") },
    { label: "Purchase readiness", value: readiness.replace(/_/g, " ") },
    { label: "Primary objection", value: objections },
  ];
}

function ProfileCard({ title, fields }: { title: string; fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="card-surface p-5">
      <p className="label-text mb-3">{title}</p>
      <dl className="flex flex-col gap-2.5">
        {fields.map((f) => (
          <div key={f.label} className="flex justify-between gap-4 text-sm">
            <dt className="text-brand-muted">{f.label}</dt>
            <dd className="font-medium text-right capitalize">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
