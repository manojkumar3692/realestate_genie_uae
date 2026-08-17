import type { LucideIcon } from "lucide-react";

export default function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className={`card-surface p-4 flex flex-col gap-1 ${accent ? "border-brand-accent/40" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="label-text mb-0">{label}</span>
        {Icon && <Icon size={15} className="text-brand-muted" />}
      </div>
      <span className="text-2xl font-display font-semibold text-brand-primary-dark">{value}</span>
    </div>
  );
}
