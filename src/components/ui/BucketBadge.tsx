const CONFIG: Record<string, { label: string; className: string; emoji: string }> = {
  hot: { label: "Hot", className: "badge-hot", emoji: "🔥" },
  warm: { label: "Warm", className: "badge-warm", emoji: "🟡" },
  possible: { label: "Possible", className: "badge-possible", emoji: "🔵" },
};

export default function BucketBadge({ bucket }: { bucket: string }) {
  const cfg = CONFIG[bucket] ?? { label: bucket, className: "bg-brand-cream text-brand-muted", emoji: "" };
  return (
    <span className={`badge ${cfg.className}`}>
      <span>{cfg.emoji}</span>
      {cfg.label}
    </span>
  );
}
