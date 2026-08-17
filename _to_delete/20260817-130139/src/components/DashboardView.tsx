"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, FileText, LayoutGrid, MapPin, Sparkles, ArrowUpRight } from "lucide-react";
import type { ProjectSummary } from "@/db/repo";
import type { FirmSettingsInput } from "@/lib/types";
import { formatMoney } from "@/lib/calculations";
import NewProjectButton from "./NewProjectButton";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardView({
  projects,
  firm,
  stats,
}: {
  projects: ProjectSummary[];
  firm: FirmSettingsInput;
  stats: { totalProjects: number; totalUnitTypes: number; totalReports: number };
}) {
  const firstName = firm.agentName?.split(" ")[0];

  return (
    <div>
      {/* Hero greeting band */}
      <div className="gradient-hero texture-dots relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-16 md:pt-14 md:pb-20 relative">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-brand-accent-light text-sm font-medium tracking-wide mb-2"
          >
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="font-display text-3xl md:text-[2.6rem] leading-tight text-white max-w-xl"
          >
            Every project, an investor-ready story.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-white/65 text-sm md:text-[15px] mt-3 max-w-md"
          >
            Build the case for your listings in minutes — pricing, projections, payment plans and
            exit strategy, all in one branded PDF.
          </motion.p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-10 md:-mt-12 relative pb-10">
        {/* Stat tiles, floating over the hero band */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid grid-cols-3 gap-3 md:gap-4 mb-8"
        >
          <StatTile icon={<Building2 size={17} />} label="Projects" value={stats.totalProjects} />
          <StatTile icon={<LayoutGrid size={17} />} label="Unit Types Listed" value={stats.totalUnitTypes} />
          <StatTile icon={<FileText size={17} />} label="PDFs Generated" value={stats.totalReports} />
        </motion.div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl md:text-2xl text-brand-primary">Your Projects</h2>
          <div className="hidden sm:block">
            <NewProjectButton />
          </div>
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        )}

        <div className="sm:hidden mt-6">
          <NewProjectButton large />
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card-surface p-4 md:p-5">
      <div className="w-8 h-8 rounded-lg bg-brand-cream text-brand-primary flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="font-display text-2xl md:text-3xl text-brand-primary leading-none">{value}</div>
      <div className="text-[11px] md:text-xs text-brand-muted mt-1.5">{label}</div>
    </div>
  );
}

function ProjectCard({ project: p, index }: { project: ProjectSummary; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
    >
      <Link href={`/projects/${p.id}`} className="card-surface-interactive block overflow-hidden group h-full">
        <div className="h-24 gradient-hero texture-dots relative flex items-end p-4">
          <StatusPill status={p.status} />
          <span className="absolute top-3 left-4 w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </span>
        </div>
        <div className="p-5 pt-4">
          <h3 className="font-display font-semibold text-[16px] text-foreground mb-1 line-clamp-1 group-hover:text-brand-primary transition-colors">
            {p.name || "Untitled Project"}
          </h3>
          <div className="flex items-center gap-1 text-xs text-brand-muted mb-3">
            <MapPin size={12} />
            {p.area || "Location not set"}
          </div>

          {p.unitTypeCount > 0 ? (
            <div className="text-sm text-foreground mb-3">
              {p.priceFrom ? (
                <span className="font-semibold">From {formatMoney(p.priceFrom, p.currency)}</span>
              ) : (
                <span className="text-brand-muted">Pricing not set</span>
              )}
              <span className="text-brand-muted"> · {p.unitTypeCount} unit type{p.unitTypeCount > 1 ? "s" : ""}</span>
            </div>
          ) : (
            <div className="text-sm text-brand-muted mb-3">No unit types added yet</div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-brand-border text-xs text-brand-muted">
            <span className="flex items-center gap-1">
              <FileText size={12} /> {p.reportCount} PDF{p.reportCount === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1 text-brand-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Open <ArrowUpRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function StatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = {
    off_plan: "Off-Plan",
    ready: "Ready",
    secondary: "Secondary",
  };
  return (
    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide bg-white/90 text-brand-primary px-2.5 py-1 rounded-full">
      {labels[status] ?? status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="card-surface p-10 md:p-14 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-accent-light to-brand-accent flex items-center justify-center mx-auto mb-5 shadow-[0_8px_24px_rgba(201,162,75,0.3)]">
        <Sparkles size={26} className="text-brand-primary-dark" />
      </div>
      <h3 className="font-display text-xl mb-2">Create your first investment PDF</h3>
      <p className="text-brand-muted text-sm max-w-sm mx-auto mb-7">
        Add a project, answer a few guided questions, and generate a premium PDF that convinces
        your clients to invest — in minutes.
      </p>
      <NewProjectButton large />
    </div>
  );
}
