import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/requireSession";
import { getImportJob, getColumnMappings } from "@/db/repo";
import { CANONICAL_FIELDS } from "@/lib/import/canonicalFields";
import { confirmImportAction } from "../../actions";
import SubmitButton from "@/components/SubmitButton";

export default async function MappingReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const job = await getImportJob(id, session.orgId);
  if (!job) notFound();
  const mappings = await getColumnMappings(id);

  const boundAction = confirmImportAction.bind(null, id);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <p className="label-text mb-1">Step 2 of 3 · Column Mapping</p>
      <h1 className="text-2xl md:text-3xl font-display font-semibold mb-2">Review how we understood "{job.fileName}"</h1>
      <p className="text-brand-muted text-sm mb-6">
        {job.rowCount.toLocaleString()} rows detected in sheet "{job.sheetName}". We've matched each column to our
        internal buyer schema — change anything that looks wrong, or ignore a column entirely. Nothing is imported until you confirm below.
      </p>

      <form action={boundAction} className="flex flex-col gap-6">
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-cream text-brand-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Uploaded Column</th>
                <th className="text-left px-4 py-3 font-semibold">Sample Values</th>
                <th className="text-left px-4 py-3 font-semibold">Detected Meaning</th>
                <th className="text-left px-4 py-3 font-semibold">Confidence</th>
                <th className="text-left px-4 py-3 font-semibold">Ignore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {mappings.map((m) => (
                <tr key={m.id} className={m.detectedField === "unmapped" ? "bg-brand-cream/40" : ""}>
                  <td className="px-4 py-3 font-medium align-top">{m.sourceColumn}</td>
                  <td className="px-4 py-3 text-brand-muted align-top max-w-[220px]">
                    <span className="line-clamp-2">{m.sampleValuesJson.slice(0, 3).join(", ") || "—"}</span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <select name={`field_${m.id}`} defaultValue={m.detectedField} className="input-field py-1.5 text-sm">
                      <option value="unmapped">— Unknown / don't map —</option>
                      {CANONICAL_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <ConfidencePill confidence={m.confidence} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input type="checkbox" name={`ignore_${m.id}`} defaultChecked={m.ignored} className="w-4 h-4 accent-brand-primary" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-brand-muted">
            Every original value is kept exactly as uploaded, even for ignored columns — you can revisit this mapping later.
          </p>
          <SubmitButton label="Confirm & Import" pendingLabel="Importing…" className="btn-accent px-8" />
        </div>
      </form>
    </div>
  );
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? "text-brand-positive bg-brand-positive-tint" : pct >= 50 ? "text-warm bg-warm-tint" : "text-hot bg-hot-tint";
  return <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>{pct}%</span>;
}
