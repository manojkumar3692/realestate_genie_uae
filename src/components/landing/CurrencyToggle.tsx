"use client";

import type { Region } from "@/lib/pricing/config";

export default function CurrencyToggle({ region, onChange }: { region: Region; onChange: (r: Region) => void }) {
  return (
    <div className="inline-flex items-center rounded-full ai-glass-card p-1 text-sm">
      {(["AE", "IN"] as Region[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className="px-4 py-1.5 rounded-full font-medium transition-all"
          style={
            region === r
              ? { background: "linear-gradient(100deg, var(--ai-violet), var(--ai-cyan))", color: "white" }
              : { color: "var(--ai-ink)", opacity: 0.5 }
          }
        >
          {r === "AE" ? "UAE" : "India"}
        </button>
      ))}
    </div>
  );
}
