"use client";

import { PaymentMilestoneInput, MilestoneTrigger } from "@/lib/types";
import { Field, TextInput, NumberInput, Select } from "./formFields";
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

const TRIGGER_LABELS: Record<MilestoneTrigger, string> = {
  booking: "On Booking",
  construction: "During Construction",
  handover: "On Handover",
  post_handover: "Post-Handover",
};

const PRESETS: { label: string; milestones: Omit<PaymentMilestoneInput, "id" | "projectId" | "sortOrder">[] }[] = [
  {
    label: "60/40 Plan",
    milestones: [
      { label: "On Booking", percent: 20, monthsFromLaunch: 0, triggerType: "booking" },
      { label: "During Construction", percent: 40, monthsFromLaunch: 18, triggerType: "construction" },
      { label: "On Handover", percent: 40, monthsFromLaunch: 30, triggerType: "handover" },
    ],
  },
  {
    label: "80/20 Post-Handover",
    milestones: [
      { label: "On Booking", percent: 10, monthsFromLaunch: 0, triggerType: "booking" },
      { label: "During Construction", percent: 40, monthsFromLaunch: 18, triggerType: "construction" },
      { label: "On Handover", percent: 30, monthsFromLaunch: 30, triggerType: "handover" },
      { label: "Post-Handover (3 yrs)", percent: 20, monthsFromLaunch: 42, triggerType: "post_handover" },
    ],
  },
];

export default function StepPaymentPlan({
  milestones,
  onChange,
}: {
  milestones: PaymentMilestoneInput[];
  onChange: (milestones: PaymentMilestoneInput[]) => void;
}) {
  const total = milestones.reduce((s, m) => s + m.percent, 0);

  function update(idx: number, patch: Partial<PaymentMilestoneInput>) {
    const next = [...milestones];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  function addMilestone() {
    onChange([
      ...milestones,
      {
        id: crypto.randomUUID(),
        projectId: "",
        label: "New Milestone",
        percent: 0,
        monthsFromLaunch: 0,
        triggerType: "construction",
        sortOrder: milestones.length,
      },
    ]);
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    onChange(
      preset.milestones.map((m, idx) => ({
        ...m,
        id: crypto.randomUUID(),
        projectId: "",
        sortOrder: idx,
      }))
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-brand-primary">Payment Plan</h2>
      <p className="text-sm text-brand-muted -mt-3">
        Build the milestone schedule — shown as a timeline and table in the PDF.
      </p>

      {milestones.length === 0 && (
        <div className="card-surface p-6 text-center text-sm text-brand-muted">
          Start from a common template:
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p)} type="button" className="btn-secondary text-xs py-1.5 px-3">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {milestones.map((m, idx) => (
          <div key={m.id} className="card-surface p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
            <Field label="Label" className="col-span-2 sm:col-span-1">
              <TextInput value={m.label} onChange={(e) => update(idx, { label: e.target.value })} />
            </Field>
            <Field label="%">
              <NumberInput value={m.percent} onChange={(v) => update(idx, { percent: v })} />
            </Field>
            <Field label="Months From Launch">
              <NumberInput value={m.monthsFromLaunch} onChange={(v) => update(idx, { monthsFromLaunch: v })} />
            </Field>
            <Field label="Trigger">
              <Select value={m.triggerType} onChange={(e) => update(idx, { triggerType: e.target.value as MilestoneTrigger })}>
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <button
              onClick={() => onChange(milestones.filter((_, i) => i !== idx))}
              type="button"
              className="text-red-500 hover:bg-red-50 p-2 rounded-lg justify-self-end"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {milestones.length > 0 && (
        <div className="flex items-center justify-between">
          <button onClick={addMilestone} type="button" className="btn-secondary flex items-center gap-2 text-sm">
            <Plus size={15} /> Add milestone
          </button>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${total === 100 ? "text-brand-positive" : "text-amber-600"}`}>
            {total === 100 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            Total: {total}%
          </div>
        </div>
      )}
    </div>
  );
}
