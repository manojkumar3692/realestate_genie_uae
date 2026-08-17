import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card-surface flex flex-col items-center text-center gap-3 px-6 py-14">
      <span className="w-14 h-14 rounded-2xl bg-brand-cream flex items-center justify-center text-brand-primary">
        <Icon size={26} />
      </span>
      <h3 className="text-lg font-display font-semibold">{title}</h3>
      <p className="text-sm text-brand-muted max-w-sm">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn-accent mt-2">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
