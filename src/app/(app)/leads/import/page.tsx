import { UploadCloud } from "lucide-react";
import { uploadImportAction } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default async function ImportLeadsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <p className="label-text mb-1">Lead Import</p>
      <h1 className="text-2xl md:text-3xl font-display font-semibold mb-2">Import your historical leads</h1>
      <p className="text-brand-muted text-sm mb-8">
        Upload a CSV or Excel export from any CRM — Bayut, Property Finder, Zoho, HubSpot, or a plain spreadsheet.
        You don't need to reformat anything; we'll detect the columns and let you review the mapping before anything is imported.
      </p>

      {error && <p className="text-sm text-hot bg-hot-tint rounded-lg px-3 py-2 mb-4">{error}</p>}

      <form action={uploadImportAction} className="card-surface p-8 flex flex-col items-center gap-4 border-dashed">
        <span className="w-16 h-16 rounded-2xl bg-brand-cream flex items-center justify-center text-brand-primary">
          <UploadCloud size={28} />
        </span>
        <div className="text-center">
          <p className="font-medium">Drop your file here or browse</p>
          <p className="text-xs text-brand-muted mt-1">.csv or .xlsx — up to 25MB</p>
        </div>
        <input
          type="file"
          name="file"
          accept=".csv,.xlsx"
          required
          className="text-sm file:mr-3 file:btn-secondary file:btn-sm file:border-0 file:cursor-pointer"
        />
        <SubmitButton label="Upload & Analyze" pendingLabel="Analyzing file…" className="btn-accent mt-2 px-8" />
      </form>

      <div className="mt-6 text-xs text-brand-muted space-y-1">
        <p>What happens next: we detect your columns, you review/adjust the mapping, then we normalize, dedupe, and build buyer profiles.</p>
        <p>Nothing is permanently changed until you confirm the mapping on the next screen.</p>
      </div>
    </div>
  );
}
