"use client";

import type { Region } from "@/lib/pricing/config";

export default function CurrencyToggle({ region, onChange }: { region: Region; onChange: (r: Region) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-[var(--ai-border)] p-1 text-sm">
      {(["AE", "IN"] as Region[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className="px-4 py-1.5 rounded-full font-medium transition-all text-[13px]"
          style={r === region ? { background: "var(--ai-ink)", color: "var(--ai-bg)" } : { color: "var(--ai-ink-faint)" }}
        >
          {r === "AE" ? "UAE" : "India"}
        </button>
      ))}
    </div>
  );
}
