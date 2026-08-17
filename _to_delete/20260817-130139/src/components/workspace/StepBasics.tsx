"use client";

import { ProjectDirectoryMatch, ProjectInput } from "@/lib/types";
import { Field, TextInput, TextArea, Select } from "./formFields";
import { Loader2, Wand2, X } from "lucide-react";
import { useEffect, useRef } from "react";

export type AutofillStatus = "idle" | "loading" | "found" | "not-found";

export default function StepBasics({
  project,
  onChange,
  onSuggest,
  suggestions = [],
  suggestOpen = false,
  suggestLoading = false,
  onPickSuggestion,
  onCloseSuggestions,
  autofillStatus = "idle",
  autofillNote,
}: {
  project: ProjectInput;
  onChange: (patch: Partial<ProjectInput>) => void;
  /** Fetches candidate matches for whatever is currently typed in the name field. */
  onSuggest?: () => void;
  suggestions?: ProjectDirectoryMatch[];
  suggestOpen?: boolean;
  suggestLoading?: boolean;
  onPickSuggestion?: (match: ProjectDirectoryMatch) => void;
  onCloseSuggestions?: () => void;
  autofillStatus?: AutofillStatus;
  autofillNote?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const nameWrapRef = useRef<HTMLDivElement>(null);

  // Dismiss the suggestions dropdown on outside click or Escape.
  useEffect(() => {
    if (!suggestOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (nameWrapRef.current && !nameWrapRef.current.contains(e.target as Node)) {
        onCloseSuggestions?.();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [suggestOpen, onCloseSuggestions]);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ heroImageDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  function addAmenity(value: string) {
    const v = value.trim();
    if (!v || project.amenities.includes(v)) return;
    onChange({ amenities: [...project.amenities, v] });
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-brand-primary">Project Basics</h2>
      <p className="text-sm text-brand-muted -mt-3">
        The essentials your client sees first — project identity, location and trust signals.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Project Name" className="sm:col-span-2">
          <div ref={nameWrapRef} className="relative">
            <div className="flex items-center gap-2">
              <TextInput
                value={project.name}
                onChange={(e) => onChange({ name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSuggest?.();
                  } else if (e.key === "Escape") {
                    onCloseSuggestions?.();
                  }
                }}
                placeholder="e.g. Marina Horizon Residences"
                className="flex-1"
              />
              {onSuggest && (
                <button
                  type="button"
                  onClick={onSuggest}
                  disabled={!project.name.trim() || suggestLoading}
                  title="Find matching projects in your directory"
                  aria-label="Find matching projects in your directory"
                  className="btn-secondary shrink-0 px-3 py-2.5 disabled:opacity-40"
                >
                  {suggestLoading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                </button>
              )}
            </div>

            {suggestOpen && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1.5 w-full rounded-lg border border-brand-border bg-white shadow-lg overflow-hidden">
                <p className="px-3 pt-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-brand-muted">
                  Matching projects — select one to reuse
                </p>
                <div className="max-h-64 overflow-y-auto divide-y divide-brand-border">
                  {suggestions.map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => onPickSuggestion?.(m)}
                      className="w-full text-left px-3 py-2.5 hover:bg-brand-cream transition-colors"
                    >
                      <p className="text-sm font-medium text-brand-primary">{m.name}</p>
                      <p className="text-xs text-brand-muted">
                        {[m.developer, m.area].filter(Boolean).join(" • ") || "No details yet"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {autofillStatus === "found" && (
            <p className="text-[11px] text-brand-positive mt-1.5">
              Filled from your project directory. {autofillNote}
            </p>
          )}
          {autofillStatus === "not-found" && (
            <p className="text-[11px] text-brand-muted mt-1.5">
              No matching projects found in your directory — this will be the first entry for this name.
            </p>
          )}
        </Field>

        <Field label="Developer">
          <TextInput value={project.developer} onChange={(e) => onChange({ developer: e.target.value })} placeholder="e.g. Emaar" />
        </Field>

        <Field label="Status">
          <Select value={project.status} onChange={(e) => onChange({ status: e.target.value as ProjectInput["status"] })}>
            <option value="off_plan">Off-Plan</option>
            <option value="ready">Ready</option>
            <option value="secondary">Secondary Market</option>
          </Select>
        </Field>

        <Field label="Area / Community">
          <TextInput value={project.area} onChange={(e) => onChange({ area: e.target.value })} placeholder="e.g. Dubai Marina" />
        </Field>

        <Field label="Sub-location / Street">
          <TextInput value={project.subLocation} onChange={(e) => onChange({ subLocation: e.target.value })} placeholder="e.g. Waterfront District" />
        </Field>

        <Field label="RERA Project No.">
          <TextInput value={project.reraNumber} onChange={(e) => onChange({ reraNumber: e.target.value })} placeholder="e.g. DXB-RERA-98213" />
        </Field>

        <Field label="Escrow Bank">
          <TextInput value={project.escrowBank} onChange={(e) => onChange({ escrowBank: e.target.value })} placeholder="e.g. Emirates NBD" />
        </Field>

        <Field label="Launch Date" hint="Used as the anchor date for payment plan milestones">
          <TextInput type="date" value={project.launchDate ?? ""} onChange={(e) => onChange({ launchDate: e.target.value || null })} />
        </Field>

        <Field label="Handover Date">
          <TextInput type="date" value={project.handoverDate ?? ""} onChange={(e) => onChange({ handoverDate: e.target.value || null })} />
        </Field>

        <Field label="Total Units">
          <TextInput
            type="number"
            value={project.totalUnits ?? ""}
            onChange={(e) => onChange({ totalUnits: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>

        <Field label="Currency">
          <Select value={project.currency} onChange={(e) => onChange({ currency: e.target.value })}>
            <option value="AED">AED</option>
            <option value="USD">USD</option>
          </Select>
        </Field>

        <Field label="Description" className="sm:col-span-2">
          <TextArea
            rows={4}
            value={project.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="A short, compelling paragraph the PDF will lead with..."
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <input
          id="goldenVisa"
          type="checkbox"
          checked={project.goldenVisaEligible}
          onChange={(e) => onChange({ goldenVisaEligible: e.target.checked })}
          className="w-4 h-4 accent-[var(--brand-primary)]"
        />
        <label htmlFor="goldenVisa" className="text-sm">
          Eligible for UAE Golden Visa (property value ≥ AED 2M)
        </label>
      </div>

      <Field label="Hero Image (optional)" hint="Shown as the PDF cover background">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="text-sm" />
        {project.heroImageDataUrl && (
          <div className="mt-2 relative w-40 h-24 rounded-lg overflow-hidden border border-brand-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.heroImageDataUrl} alt="Hero preview" className="w-full h-full object-cover" />
            <button
              onClick={() => onChange({ heroImageDataUrl: null })}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
              type="button"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </Field>

      <Field label="Amenities" hint="Press Enter to add">
        <AmenityInput amenities={project.amenities} onAdd={addAmenity} onRemove={(a) => onChange({ amenities: project.amenities.filter((x) => x !== a) })} />
      </Field>
    </div>
  );
}

function AmenityInput({
  amenities,
  onAdd,
  onRemove,
}: {
  amenities: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  return (
    <div>
      <input
        className="input-field"
        placeholder="e.g. Infinity Pool"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).value = "";
          }
        }}
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {amenities.map((a) => (
          <span key={a} className="flex items-center gap-1 bg-brand-cream border border-brand-border rounded-full px-3 py-1 text-xs">
            {a}
            <button onClick={() => onRemove(a)} type="button">
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
