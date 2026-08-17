"use client";

import { useState, useTransition } from "react";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { parseProjectTextAction, createProjectAction, type CreateProjectFormInput } from "@/app/(app)/projects/new/actions";

type UnitTypeRow = CreateProjectFormInput["unitTypes"][number];

const EMPTY_UNIT: UnitTypeRow = { typeLabel: "", bedrooms: 1, sizeSqftMin: 0, sizeSqftMax: 0, priceFrom: 0, priceTo: 0 };

function toList(s: string): string[] {
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function ProjectForm() {
  const [pastedText, setPastedText] = useState("");
  const [parsing, startParsing] = useTransition();
  const [submitting, startSubmitting] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [parseNote, setParseNote] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [developer, setDeveloper] = useState("");
  const [city, setCity] = useState("Dubai");
  const [community, setCommunity] = useState("");
  const [location, setLocation] = useState("");
  const [nearbyAreas, setNearbyAreas] = useState("");
  const [propertyTypes, setPropertyTypes] = useState("Apartment");
  const [bedroomTypes, setBedroomTypes] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [currency, setCurrency] = useState("AED");
  const [paymentPlanSummary, setPaymentPlanSummary] = useState("");
  const [downPaymentPercent, setDownPaymentPercent] = useState("");
  const [constructionStatus, setConstructionStatus] = useState<"off_plan" | "ready">("off_plan");
  const [expectedHandover, setExpectedHandover] = useState("");
  const [expectedRentalYieldPercent, setExpectedRentalYieldPercent] = useState("");
  const [expectedAppreciationPercent, setExpectedAppreciationPercent] = useState("");
  const [targetBuyerType, setTargetBuyerType] = useState<"investor" | "end_user" | "both">("both");
  const [freeholdStatus, setFreeholdStatus] = useState(true);
  const [amenities, setAmenities] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [notes, setNotes] = useState("");
  const [unitTypes, setUnitTypes] = useState<UnitTypeRow[]>([{ ...EMPTY_UNIT }]);

  function handleParse() {
    setParseNote(null);
    startParsing(async () => {
      const parsed = await parseProjectTextAction(pastedText);
      if (!parsed) {
        setParseNote(
          "AI parsing isn't available right now (no AI key configured, or nothing usable was found) — fill in the fields below manually."
        );
        return;
      }
      if (parsed.name) setName(parsed.name);
      if (parsed.developer) setDeveloper(parsed.developer);
      if (parsed.city) setCity(parsed.city);
      if (parsed.community) setCommunity(parsed.community);
      if (parsed.location) setLocation(parsed.location);
      if (parsed.nearbyAreas?.length) setNearbyAreas(parsed.nearbyAreas.join(", "));
      if (parsed.propertyTypes?.length) setPropertyTypes(parsed.propertyTypes.join(", "));
      if (parsed.bedroomTypes?.length) setBedroomTypes(parsed.bedroomTypes.join(", "));
      if (parsed.startingPrice) setStartingPrice(String(parsed.startingPrice));
      if (parsed.maxPrice) setMaxPrice(String(parsed.maxPrice));
      if (parsed.currency) setCurrency(parsed.currency);
      if (parsed.paymentPlanSummary) setPaymentPlanSummary(parsed.paymentPlanSummary);
      if (parsed.downPaymentPercent) setDownPaymentPercent(String(parsed.downPaymentPercent));
      if (parsed.constructionStatus) setConstructionStatus(parsed.constructionStatus);
      if (parsed.expectedHandover) setExpectedHandover(parsed.expectedHandover);
      if (parsed.expectedRentalYieldPercent) setExpectedRentalYieldPercent(String(parsed.expectedRentalYieldPercent));
      if (parsed.expectedAppreciationPercent) setExpectedAppreciationPercent(String(parsed.expectedAppreciationPercent));
      if (parsed.targetBuyerType) setTargetBuyerType(parsed.targetBuyerType);
      if (parsed.amenities?.length) setAmenities(parsed.amenities.join(", "));
      if (parsed.sellingPoints?.length) setSellingPoints(parsed.sellingPoints.join(", "));
      if (parsed.unitTypes?.length) {
        setUnitTypes(
          parsed.unitTypes.map((u) => ({
            typeLabel: u.typeLabel,
            bedrooms: u.bedrooms,
            sizeSqftMin: u.sizeSqftMin ?? 0,
            sizeSqftMax: u.sizeSqftMax ?? 0,
            priceFrom: u.priceFrom ?? 0,
            priceTo: u.priceTo ?? 0,
          }))
        );
      }
      setParseNote("Fields below were pre-filled from your pasted text — review and adjust anything before saving.");
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: CreateProjectFormInput = {
      name,
      developer,
      city,
      community,
      location: location || community,
      nearbyAreas: toList(nearbyAreas),
      propertyTypes: toList(propertyTypes),
      bedroomTypes: toList(bedroomTypes),
      startingPrice: startingPrice ? Number(startingPrice) : null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      currency,
      paymentPlanSummary,
      downPaymentPercent: downPaymentPercent ? Number(downPaymentPercent) : null,
      constructionStatus,
      expectedHandover,
      expectedRentalYieldPercent: expectedRentalYieldPercent ? Number(expectedRentalYieldPercent) : null,
      expectedAppreciationPercent: expectedAppreciationPercent ? Number(expectedAppreciationPercent) : null,
      targetBuyerType,
      freeholdStatus,
      amenities: toList(amenities),
      sellingPoints: toList(sellingPoints),
      notes,
      rawPastedText: pastedText,
      unitTypes,
    };
    startSubmitting(async () => {
      const result = await createProjectAction(input);
      if (result?.error) setError(result.error);
    });
  }

  function updateUnit(index: number, patch: Partial<UnitTypeRow>) {
    setUnitTypes((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="card-surface p-5">
        <label className="label-text">Paste project information</label>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows={5}
          placeholder="Paste a brochure blurb, WhatsApp broker update, or listing description here…"
          className="input-field resize-y"
        />
        <div className="flex items-center gap-3 mt-3">
          <button type="button" onClick={handleParse} disabled={parsing || !pastedText.trim()} className="btn-secondary flex items-center gap-1.5">
            <Sparkles size={14} /> {parsing ? "Parsing…" : "Parse with AI"}
          </button>
          {parseNote && <p className="text-xs text-brand-muted">{parseNote}</p>}
        </div>
      </div>

      {error && <p className="text-sm text-hot bg-hot-tint rounded-lg px-3 py-2">{error}</p>}

      <div className="card-surface p-5 grid md:grid-cols-2 gap-4">
        <Field label="Project name" value={name} onChange={setName} required />
        <Field label="Developer" value={developer} onChange={setDeveloper} />
        <Field label="City" value={city} onChange={setCity} />
        <Field label="Community" value={community} onChange={setCommunity} />
        <Field label="Location (canonical area)" value={location} onChange={setLocation} placeholder="e.g. Dubai South" />
        <Field label="Nearby areas (comma-separated)" value={nearbyAreas} onChange={setNearbyAreas} />
        <Field label="Property types (comma-separated)" value={propertyTypes} onChange={setPropertyTypes} />
        <Field label="Bedroom types (comma-separated)" value={bedroomTypes} onChange={setBedroomTypes} placeholder="Studio, 1BR, 2BR" />
      </div>

      <div className="card-surface p-5 grid md:grid-cols-3 gap-4">
        <Field label="Currency" value={currency} onChange={setCurrency} />
        <Field label="Starting price" value={startingPrice} onChange={setStartingPrice} type="number" />
        <Field label="Max price" value={maxPrice} onChange={setMaxPrice} type="number" />
        <Field label="Payment plan summary" value={paymentPlanSummary} onChange={setPaymentPlanSummary} placeholder="e.g. 20/50/30" />
        <Field label="Down payment %" value={downPaymentPercent} onChange={setDownPaymentPercent} type="number" />
        <div>
          <label className="label-text">Construction status</label>
          <select value={constructionStatus} onChange={(e) => setConstructionStatus(e.target.value as "off_plan" | "ready")} className="input-field">
            <option value="off_plan">Off-plan</option>
            <option value="ready">Ready</option>
          </select>
        </div>
        <Field label="Expected handover" value={expectedHandover} onChange={setExpectedHandover} placeholder="Q4 2029" />
        <Field label="Expected rental yield %" value={expectedRentalYieldPercent} onChange={setExpectedRentalYieldPercent} type="number" />
        <Field label="Expected appreciation %" value={expectedAppreciationPercent} onChange={setExpectedAppreciationPercent} type="number" />
        <div>
          <label className="label-text">Target buyer</label>
          <select value={targetBuyerType} onChange={(e) => setTargetBuyerType(e.target.value as "investor" | "end_user" | "both")} className="input-field">
            <option value="both">Investor & End-user</option>
            <option value="investor">Investor-focused</option>
            <option value="end_user">End-user focused</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm mt-6">
          <input type="checkbox" checked={freeholdStatus} onChange={(e) => setFreeholdStatus(e.target.checked)} className="w-4 h-4 accent-brand-primary" />
          Freehold eligible
        </label>
      </div>

      <div className="card-surface p-5 grid md:grid-cols-2 gap-4">
        <Field label="Amenities (comma-separated)" value={amenities} onChange={setAmenities} />
        <Field label="Selling points (comma-separated)" value={sellingPoints} onChange={setSellingPoints} />
        <div className="md:col-span-2">
          <label className="label-text">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input-field resize-y" />
        </div>
      </div>

      <div className="card-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="label-text mb-0">Unit types & pricing</label>
          <button
            type="button"
            onClick={() => setUnitTypes((prev) => [...prev, { ...EMPTY_UNIT }])}
            className="btn-secondary btn-sm flex items-center gap-1"
          >
            <Plus size={13} /> Add unit type
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {unitTypes.map((u, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
              <MiniField label="Type" value={u.typeLabel} onChange={(v) => updateUnit(i, { typeLabel: v })} />
              <MiniField label="Bedrooms" value={String(u.bedrooms)} onChange={(v) => updateUnit(i, { bedrooms: Number(v) || 0 })} type="number" />
              <MiniField label="Sqft min" value={String(u.sizeSqftMin)} onChange={(v) => updateUnit(i, { sizeSqftMin: Number(v) || 0 })} type="number" />
              <MiniField label="Sqft max" value={String(u.sizeSqftMax)} onChange={(v) => updateUnit(i, { sizeSqftMax: Number(v) || 0 })} type="number" />
              <MiniField label="Price from" value={String(u.priceFrom)} onChange={(v) => updateUnit(i, { priceFrom: Number(v) || 0 })} type="number" />
              <div className="flex gap-2 items-end">
                <MiniField label="Price to" value={String(u.priceTo)} onChange={(v) => updateUnit(i, { priceTo: Number(v) || 0 })} type="number" />
                <button
                  type="button"
                  onClick={() => setUnitTypes((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-hot p-2 hover:bg-hot-tint rounded-lg shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={submitting} className="btn-accent self-start px-8">
        {submitting ? "Saving…" : "Save Project"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label-text">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      />
    </div>
  );
}

function MiniField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[10px] text-brand-muted uppercase font-semibold">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="input-field py-1.5 text-sm" />
    </div>
  );
}
