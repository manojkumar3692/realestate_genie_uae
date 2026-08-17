"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Settings, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function NavBar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 glass-surface border-b border-white/10 shadow-[0_4px_20px_rgba(7,39,34,0.18)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-accent-light to-brand-accent text-brand-primary-dark flex items-center justify-center shadow-[0_2px_8px_rgba(201,162,75,0.4)] transition-transform group-hover:scale-105 group-hover:rotate-3">
              <Building2 size={18} strokeWidth={2.5} />
            </span>
            <span className="text-[16px] font-display font-semibold tracking-tight text-white">
              Real Estate <span className="text-brand-accent-light italic">Genie</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/" active={isActive("/")}>
              Dashboard
            </NavLink>
            <NavLink href="/settings" active={isActive("/settings")}>
              Firm Settings
            </NavLink>
          </nav>

          <Link
            href="/projects/new"
            className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-brand-accent-light to-brand-accent text-brand-primary-dark text-sm font-semibold px-4 py-2 rounded-lg shadow-[0_2px_10px_rgba(201,162,75,0.35)] transition-all hover:shadow-[0_4px_16px_rgba(201,162,75,0.5)] hover:-translate-y-0.5"
          >
            <Sparkles size={15} /> New Project
          </Link>

          <Link
            href="/projects/new"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-brand-accent-light to-brand-accent text-brand-primary-dark shadow-[0_2px_8px_rgba(201,162,75,0.4)]"
            aria-label="New project"
          >
            <Sparkles size={16} />
          </Link>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-lg border-t border-brand-border flex items-stretch h-[68px] shadow-[0_-4px_16px_rgba(15,35,32,0.06)]">
        <MobileTab href="/" label="Dashboard" active={isActive("/")} icon={<LayoutDashboard size={20} />} />
        <MobileTab href="/settings" label="Settings" active={isActive("/settings")} icon={<Settings size={20} />} />
      </nav>
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className="relative px-3.5 py-2 rounded-lg text-sm font-medium">
      <span className={`relative z-10 transition-colors ${active ? "text-white" : "text-white/65 hover:text-white"}`}>
        {children}
      </span>
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          className="absolute inset-0 bg-white/12 rounded-lg"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
    </Link>
  );
}

function MobileTab({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
        active ? "text-brand-primary" : "text-brand-muted"
      }`}
    >
      <span className={`transition-transform ${active ? "scale-110" : ""}`}>{icon}</span>
      {label}
    </Link>
  );
}
