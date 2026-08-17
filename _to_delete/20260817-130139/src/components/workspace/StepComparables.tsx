"use client";

import { ComparableProjectInput, PriceHistoryPoint } from "@/lib/types";
import { Field, TextInput, NumberInput } from "./formFields";
import { Plus, Trash2 } from "lucide-react";

export default function StepComparables({
  comparables,
  onChange,
}: {
  comparables: ComparableProjectInput[];
  onChange: (comparables: ComparableProjectInput[]) => void;
}) {
  function update(idx: number, patch: Partial<ComparableProjectInput>) {
    const next = [...comparables];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  function addComparable() {
    onChange([
      ...comparables,
      {
        id: crypto.randomUUID(),
        projectId: "",
        name: "",
        area: "",
        distanceKm: 0,
        priceHistory: [
          { year: new Date().getFullYear() - 3, pricePerSqft: 0 },
          { year: new Date().getFullYear(), pricePerSqft: 0 },
        ],
        notes: "",
        sortOrder: comparables.length,
      },
    ]);
  }

  function updateHistoryPoint(cIdx: number, pIdx: number, patch: Partial<PriceHistoryPoint>) {
    const next = [...comparables];
    const history = [...next[cIdx].priceHistory];
    history[pIdx] = { ...history[pIdx], ...patch };
    next[cIdx] = { ...next[cIdx], priceHistory: history };
    onChange(next);
  }

  function addHistoryPoint(cIdx: number) {
    const next = [...comparables];
    const history = next[cIdx].priceHistory;
    const lastYear = history.length ? history[history.length - 1].year : new Date().getFullYear();
    next[cIdx] = { ...next[cIdx], priceHistory: [...history, { year: lastYear + 1, pricePerSqft: 0 }] };
    onChange(next);
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-brand-primary">Nearby / Comparable Projects</h2>
      <p className="text-sm text-brand-muted -mt-3">
        Show your client that the area has a track record — add 2-4 nearby projects with their price-per-sq.ft history.
        This drives the market growth chart in the PDF.
      </p>

      <div className="space-y-4">
        {comparables.map((c, idx) => (
          <div key={c.id} className="card-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-brand-primary">Comparable {idx + 1}</span>
              <button
                onClick={() => onChange(comparables.filter((_, i) => i !== idx))}
                type="button"
                className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-3">
              <Field label="Project Name">
                <TextInput value={c.name} onChange={(e) => update(idx, { name: e.target.value })} />
              </Field>
              <Field label="Area">
                <TextInput value={c.area} onChange={(e) => update(idx, { area: e.target.value })} />
              </Field>
              <Field label="Distance (km)">
                <NumberInput value={c.distanceKm} onChange={(v) => update(idx, { distanceKm: v })} />
              </Field>
            </div>

            <label className="label-text">Price / sq.ft History</label>
            <div className="space-y-2">
              {c.priceHistory.map((p, pIdx) => (
                <div key={pIdx} className="flex items-center gap-2">
                  <NumberInput
                    value={p.year}
                    onChange={(v) => updateHistoryPoint(idx, pIdx, { year: v })}
                    className="max-w-[100px]"
                    aria-label="Year"
                  />
                  <NumberInput
                    value={p.pricePerSqft}
                    onChange={(v) => updateHistoryPoint(idx, pIdx, { pricePerSqft: v })}
                    className="flex-1"
                    aria-label="Price per sq.ft"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update(idx, { priceHistory: c.priceHistory.filter((_, i) => i !== pIdx) })
                    }
                    className="text-red-500 p-1.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => addHistoryPoint(idx)} type="button" className="text-xs text-brand-primary font-medium mt-2 flex items-center gap-1">
              <Plus size={12} /> Add year
            </button>
          </div>
        ))}
      </div>

      <button onClick={addComparable} type="button" className="btn-secondary flex items-center gap-2 text-sm">
        <Plus size={15} /> Add comparable project
      </button>
    </div>
  );
}
