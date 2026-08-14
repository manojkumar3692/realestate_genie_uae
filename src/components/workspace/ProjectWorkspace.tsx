"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
  const [direction, setDirection] = useState(1);

  const StepIcon = STEPS[stepIdx].icon;

  function goTo(idx: number) {
    setDirection(idx > stepIdx ? 1 : -1);
    setStepIdx(idx);
  }

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
      <div className="flex items-center justify-between mb-7 gap-3">
        <div className="min-w-0">
          <p className="text-xs text-brand-muted mb-0.5">Editing project</p>
          <h1 className="text-xl md:text-2xl font-display font-semibold text-brand-primary truncate">
            {bundle.project.name || "Untitled Project"}
          </h1>
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
          <button onClick={handleDelete} disabled={deleting} className="p-2.5 rounded-lg border border-brand-border text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Mobile progress bar */}
      <div className="lg:hidden mb-5">
        <div className="flex items-center justify-between text-xs text-brand-muted mb-2">
          <span className="font-medium text-brand-primary">{STEPS[stepIdx].label}</span>
          <span>
            Step {stepIdx + 1} of {STEPS.length}
          </span>
        </div>
        <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-accent to-brand-primary rounded-full"
            animate={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        {/* Connected stepper — desktop only */}
        <div className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
          <div className="relative pl-1">
            <div className="absolute left-[19px] top-4 bottom-4 w-px bg-brand-border" />
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const active = idx === stepIdx;
              const completed = idx < stepIdx;
              return (
                <button
                  key={s.key}
                  onClick={() => goTo(idx)}
                  className="relative flex items-center gap-3 w-full text-left py-2.5 group"
                >
                  <span
                    className={`relative z-10 shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      active
                        ? "bg-brand-primary border-brand-primary text-white shadow-[0_4px_12px_rgba(11,59,55,0.3)] scale-105"
                        : completed
                          ? "bg-brand-positive-tint border-brand-positive text-brand-positive"
                          : "bg-white border-brand-border text-brand-muted group-hover:border-brand-primary/40"
                    }`}
                  >
                    {completed ? <Check size={16} /> : <Icon size={15} />}
                  </span>
                  <span
                    className={`text-sm font-medium transition-colors ${
                      active ? "text-brand-primary" : completed ? "text-foreground" : "text-brand-muted group-hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card-surface p-5 md:p-8 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={stepIdx}
              custom={direction}
              initial={{ opacity: 0, x: direction * 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -18 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
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
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8 pt-5 border-t border-brand-border">
            <button onClick={() => goTo(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0} className="btn-secondary text-sm disabled:opacity-40">
              Back
            </button>
            {stepIdx < STEPS.length - 1 ? (
              <button
                onClick={async () => {
                  await save();
                  goTo(Math.min(STEPS.length - 1, stepIdx + 1));
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
