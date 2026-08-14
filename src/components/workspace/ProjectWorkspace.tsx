"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectBundle } from "@/lib/types";
import StepBasics from "./StepBasics";
import StepUnitTypes from "./StepUnitTypes";
import StepPaymentPlan from "./StepPaymentPlan";
import StepComparables from "./StepComparables";
import StepFinancials from "./StepFinancials";
import StepReview from "./StepReview";
import { Check, Loader2, Save, Trash2, Building2, LayoutGrid, CalendarClock, TrendingUp, Wallet2, FileCheck2 } from "lucide-react";

const STEPS = [
  { key: "basics", label: "Basics", icon: Building2 },
  { key: "units", label: "Unit Types", icon: LayoutGrid },
  { key: "payment", label: "Payment Plan", icon: CalendarClock },
  { key: "comparables", label: "Comparables", icon: TrendingUp },
  { key: "financials", label: "Financials", icon: Wallet2 },
  { key: "review", label: "Review & Generate", icon: FileCheck2 },
] as const;

export default function ProjectWorkspace({
  initialBundle,
  savedReports,
}: {
  initialBundle: ProjectBundle;
  savedReports: { id: string; clientName: string; createdAt: string; pdfFileName: string }[];
}) {
  const router = useRouter();
  const [bundle, setBundle] = useState<ProjectBundle>(initialBundle);
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [deleting, setDeleting] = useState(false);

  const StepIcon = STEPS[stepIdx].icon;

  async function save(): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${bundle.project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: bundle.project,
          unitTypes: bundle.unitTypes,
          paymentMilestones: bundle.paymentMilestones,
          comparableProjects: bundle.comparableProjects,
          financials: bundle.financials,
        }),
      });
      if (!res.ok) return false;
      const updated = await res.json();
      setBundle(updated);
      setSavedAt(new Date());
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${bundle.project.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/projects/${bundle.project.id}`, { method: "DELETE" });
    router.push("/");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <p className="text-xs text-brand-muted mb-0.5">Editing project</p>
          <h1 className="text-xl md:text-2xl font-bold text-brand-primary truncate">{bundle.project.name || "Untitled Project"}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savedAt && !saving && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-brand-positive">
              <Check size={13} /> Saved
            </span>
          )}
          <button onClick={save} disabled={saving} className="btn-secondary flex items-center gap-2 text-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
          <button onClick={handleDelete} disabled={deleting} className="p-2.5 rounded-lg border border-brand-border text-red-500 hover:bg-red-50">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Step nav — horizontal scroll on mobile, vertical list on desktop */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const active = idx === stepIdx;
              return (
                <button
                  key={s.key}
                  onClick={() => setStepIdx(idx)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 lg:w-full text-left transition-colors ${
                    active ? "bg-brand-primary text-white" : "text-foreground hover:bg-brand-cream"
                  }`}
                >
                  <Icon size={15} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card-surface p-5 md:p-7 min-w-0">
          {stepIdx === 0 && (
            <StepBasics project={bundle.project} onChange={(patch) => setBundle({ ...bundle, project: { ...bundle.project, ...patch } })} />
          )}
          {stepIdx === 1 && (
            <StepUnitTypes unitTypes={bundle.unitTypes} onChange={(unitTypes) => setBundle({ ...bundle, unitTypes })} />
          )}
          {stepIdx === 2 && (
            <StepPaymentPlan
              milestones={bundle.paymentMilestones}
              onChange={(paymentMilestones) => setBundle({ ...bundle, paymentMilestones })}
            />
          )}
          {stepIdx === 3 && (
            <StepComparables
              comparables={bundle.comparableProjects}
              onChange={(comparableProjects) => setBundle({ ...bundle, comparableProjects })}
            />
          )}
          {stepIdx === 4 && (
            <StepFinancials
              financials={bundle.financials}
              onChange={(patch) => setBundle({ ...bundle, financials: { ...bundle.financials, ...patch } })}
            />
          )}
          {stepIdx === 5 && (
            <StepReview bundle={bundle} projectId={bundle.project.id} onSaveFirst={save} savedReports={savedReports} />
          )}

          <div className="flex items-center justify-between mt-8 pt-5 border-t border-brand-border">
            <button
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              disabled={stepIdx === 0}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              Back
            </button>
            {stepIdx < STEPS.length - 1 ? (
              <button
                onClick={async () => {
                  await save();
                  setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
                }}
                className="btn-primary text-sm"
              >
                Save & Continue
              </button>
            ) : (
              <span className="text-xs text-brand-muted flex items-center gap-1.5">
                <StepIcon size={13} /> Final step
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
