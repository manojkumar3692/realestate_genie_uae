const LABELS: Record<string, string> = {
  budget: "Budget",
  location: "Location",
  bedrooms: "Bedrooms",
  purpose: "Investor / End-user Fit",
  paymentPlan: "Payment Plan",
  timeline: "Timeline",
  historicalBehaviour: "Historical Behaviour",
  objectionResolution: "Objection Resolution",
};

export default function ScoreBreakdownBars({ breakdown }: { breakdown: Record<string, { score: number; max: number }> }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Object.entries(breakdown).map(([key, { score, max }]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="text-xs text-brand-muted w-40 shrink-0">{LABELS[key] ?? key}</span>
          <div className="flex-1 h-2 rounded-full bg-brand-cream overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-accent-light to-brand-accent"
              style={{ width: `${max ? (score / max) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-brand-primary-dark w-12 text-right">
            {score}/{max}
          </span>
        </div>
      ))}
    </div>
  );
}
