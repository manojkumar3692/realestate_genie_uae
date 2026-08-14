"use client";

import { UnitTypeInput } from "@/lib/types";
import { Field, TextInput, NumberInput } from "./formFields";
import { Plus, Trash2 } from "lucide-react";

const UNIT_PRESETS = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "4 Bedroom", "Penthouse", "Townhouse", "Villa"];

export default function StepUnitTypes({
  unitTypes,
  onChange,
}: {
  unitTypes: UnitTypeInput[];
  onChange: (units: UnitTypeInput[]) => void;
}) {
  function update(idx: number, patch: Partial<UnitTypeInput>) {
    const next = [...unitTypes];
    next[idx] = { ...next[idx], ...patch };
    // Keep representative price sensible if agent hasn't manually diverged it far from the midpoint.
    if (patch.priceFrom !== undefined || patch.priceTo !== undefined) {
      const mid = Math.round(((patch.priceFrom ?? next[idx].priceFrom) + (patch.priceTo ?? next[idx].priceTo)) / 2);
      if (!next[idx].representativePrice || next[idx].representativePrice === 0) {
        next[idx].representativePrice = mid;
      }
    }
    onChange(next);
  }

  function addUnit(preset?: string) {
    onChange([
      ...unitTypes,
      {
        id: crypto.randomUUID(),
        projectId: "",
        typeLabel: preset ?? "1 Bedroom",
        sizeSqftMin: 0,
        sizeSqftMax: 0,
        priceFrom: 0,
        priceTo: 0,
        representativePrice: 0,
        serviceChargePerSqft: 15,
        sortOrder: unitTypes.length,
      },
    ]);
  }

  function removeUnit(idx: number) {
    onChange(unitTypes.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-brand-primary">Unit Types & Pricing</h2>
      <p className="text-sm text-brand-muted -mt-3">
        Add every unit type on offer — the PDF will show a side-by-side investment comparison across all of them.
      </p>

      {unitTypes.length === 0 && (
        <div className="card-surface p-6 text-center text-sm text-brand-muted">
          No unit types yet. Quick add:
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {UNIT_PRESETS.slice(0, 4).map((p) => (
              <button key={p} onClick={() => addUnit(p)} type="button" className="btn-secondary text-xs py-1.5 px-3">
                + {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {unitTypes.map((u, idx) => (
          <div key={u.id} className="card-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <input
                list="unit-presets"
                value={u.typeLabel}
                onChange={(e) => update(idx, { typeLabel: e.target.value })}
                className="input-field font-semibold max-w-[220px]"
              />
              <button onClick={() => removeUnit(idx)} type="button" className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Size From (sq.ft)">
                <NumberInput value={u.sizeSqftMin} onChange={(v) => update(idx, { sizeSqftMin: v })} />
              </Field>
              <Field label="Size To (sq.ft)">
                <NumberInput value={u.sizeSqftMax} onChange={(v) => update(idx, { sizeSqftMax: v })} />
              </Field>
              <Field label="Service Charge (per sq.ft/yr)">
                <NumberInput value={u.serviceChargePerSqft} onChange={(v) => update(idx, { serviceChargePerSqft: v })} />
              </Field>
              <Field label="Price From">
                <NumberInput value={u.priceFrom} onChange={(v) => update(idx, { priceFrom: v })} />
              </Field>
              <Field label="Price To">
                <NumberInput value={u.priceTo} onChange={(v) => update(idx, { priceTo: v })} />
              </Field>
              <Field label="Representative Price" hint="Used for all PDF calculations">
                <NumberInput value={u.representativePrice} onChange={(v) => update(idx, { representativePrice: v })} />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <datalist id="unit-presets">
        {UNIT_PRESETS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {unitTypes.length > 0 && (
        <button onClick={() => addUnit()} type="button" className="btn-secondary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add another unit type
        </button>
      )}
    </div>
  );
}
