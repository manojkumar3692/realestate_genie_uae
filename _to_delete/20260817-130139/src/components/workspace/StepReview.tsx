"use client";

import { useMemo, useState } from "react";
import { ProjectBundle, ReportClientInfo, ClientType } from "@/lib/types";
import { computeYearlyProjection, computeExitLiquidity, formatMoney } from "@/lib/calculations";
import { Field, TextInput, Select } from "./formFields";
import ShareButtons from "./ShareButtons";
import { FileText, Loader2, Sparkles } from "lucide-react";

export interface GeneratedReportResult {
  reportId: string;
  downloadUrl: string;
}

export default function StepReview({
  bundle,
  projectId,
  onSaveFirst,
  savedReports,
}: {
  bundle: ProjectBundle;
  projectId: string;
  onSaveFirst: () => Promise<boolean>;
  savedReports: { id: string; clientName: string; createdAt: string; pdfFileName: string }[];
}) {
  const [clientInfo, setClientInfo] = useState<ReportClientInfo>({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    focusUnitTypeId: bundle.unitTypes[0]?.id ?? null,
    clientType: "investor",
    flipExitYear: 2,
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedReportResult | null>(null);

  const focusUnit = bundle.unitTypes.find((u) => u.id === clientInfo.focusUnitTypeId) ?? bundle.unitTypes[0];

  // For the live preview, mirror the same exit-year override the PDF uses for a flip
  // scenario, so the numbers the agent sees before generating match what's in the PDF.
  const previewFinancials =
    clientInfo.clientType === "flip"
      ? {
          ...bundle.financials,
          exitYear: Math.min(
            Math.max(1, clientInfo.flipExitYear ?? 2),
            Math.max(1, bundle.financials.projectionYears)
          ),
        }
      : bundle.financials;

  const preview = useMemo(() => {
    if (!focusUnit) return null;
    const projection = computeYearlyProjection(focusUnit, bundle.financials);
    const exit = computeExitLiquidity(focusUnit, previewFinancials, projection);
    const last = projection.rows[projection.rows.length - 1];
    return { projection, exit, last };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusUnit, bundle.financials, clientInfo.clientType, clientInfo.flipExitYear]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const saved = await onSaveFirst();
      if (!saved) {
        setError("Could not save your changes. Please check required fields and try again.");
        return;
      }
      const res = await fetch(`/api/projects/${projectId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientInfo),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to generate PDF");
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  if (!bundle.unitTypes.length) {
    return (
      <div className="card-surface p-6 text-sm text-brand-muted">
        Add at least one unit type before generating a report.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-primary">Review & Generate PDF</h2>
        <p className="text-sm text-brand-muted mt-1">
          Add your client&apos;s details, double-check the numbers, then generate a branded investment PDF.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Client Name">
          <TextInput value={clientInfo.clientName} onChange={(e) => setClientInfo({ ...clientInfo, clientName: e.target.value })} placeholder="e.g. Mr. Rajesh Kumar" />
        </Field>
        <Field label="Focus Unit Type" hint="The PDF projection pages will center on this unit">
          <Select
            value={clientInfo.focusUnitTypeId ?? ""}
            onChange={(e) => setClientInfo({ ...clientInfo, focusUnitTypeId: e.target.value })}
          >
            {bundle.unitTypes.map((u) => (
              <option key={u.id} value={u.id}>
                {u.typeLabel} — {formatMoney(u.representativePrice || u.priceFrom, bundle.project.currency)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Client Phone (for WhatsApp)">
          <TextInput
            value={clientInfo.clientPhone}
            onChange={(e) => setClientInfo({ ...clientInfo, clientPhone: e.target.value })}
            placeholder="+971 5X XXX XXXX"
          />
        </Field>
        <Field label="Client Email">
          <TextInput
            type="email"
            value={clientInfo.clientEmail}
            onChange={(e) => setClientInfo({ ...clientInfo, clientEmail: e.target.value })}
            placeholder="client@example.com"
          />
        </Field>
        <Field label="Client Type" hint="Changes which numbers and narrative the PDF leads with">
          <Select
            value={clientInfo.clientType}
            onChange={(e) => setClientInfo({ ...clientInfo, clientType: e.target.value as ClientType })}
          >
            <option value="investor">Investor (buy-to-let)</option>
            <option value="end_user">End User (buying to live in)</option>
            <option value="flip">Flip (short-term resale)</option>
          </Select>
        </Field>
        {clientInfo.clientType === "flip" && (
          <Field label="Planned Exit Year" hint="How many years until the planned resale">
            <TextInput
              type="number"
              min={1}
              max={bundle.financials.projectionYears}
              value={clientInfo.flipExitYear ?? 2}
              onChange={(e) => setClientInfo({ ...clientInfo, flipExitYear: e.target.value ? Number(e.target.value) : 2 })}
            />
          </Field>
        )}
      </div>

      {preview && (
        <div className="rounded-2xl gradient-hero texture-dots p-5 md:p-6">
          <div className="text-xs font-semibold text-brand-accent-light uppercase tracking-wide mb-3.5">Live Preview</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat label="Entry Price" value={formatMoney(focusUnit.representativePrice || focusUnit.priceFrom, bundle.project.currency)} />
            <MiniStat
              label={`Value in Yr ${preview.last.year}`}
              value={formatMoney(preview.last.propertyValue, bundle.project.currency)}
            />
            <MiniStat label="Cumulative ROI" value={`${preview.last.roiOnInvestmentPercent.toFixed(1)}%`} positive />
            <MiniStat label="Exit Money Multiple" value={`${preview.exit.moneyMultiple.toFixed(2)}x`} positive />
          </div>
          <p className="text-[11px] text-white/55 mt-4">
            Want different numbers? Go back to the Financials or Unit Types step to adjust assumptions — this preview
            updates instantly, and the generated PDF will always reflect your latest edits.
          </p>
        </div>
      )}

      <button onClick={handleGenerate} disabled={generating} className="btn-accent flex items-center gap-2">
        {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {generating ? "Generating PDF…" : "Generate Investment PDF"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="card-surface p-5 border-brand-accent">
          <p className="font-semibold text-brand-primary mb-3">PDF generated successfully 🎉</p>
          <ShareButtons
            downloadUrl={result.downloadUrl}
            projectName={bundle.project.name}
            clientName={clientInfo.clientName}
            clientPhone={clientInfo.clientPhone}
            clientEmail={clientInfo.clientEmail}
            agentName={bundle.firm.agentName}
          />
        </div>
      )}

      {savedReports.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-brand-primary mb-2">Previously Generated</h3>
          <div className="space-y-2">
            {savedReports.map((r) => (
              <a
                key={r.id}
                href={`/api/reports/${r.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between card-surface p-3 text-sm hover:bg-brand-cream transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText size={15} className="text-brand-muted" />
                  {r.clientName || "Unnamed client"}
                </span>
                <span className="text-xs text-brand-muted">{new Date(r.createdAt).toLocaleString()}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-white/8 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-wide text-white/55 mb-1.5">{label}</div>
      <div className={`text-base font-display font-semibold ${positive ? "text-brand-accent-light" : "text-white"}`}>{value}</div>
    </div>
  );
}
