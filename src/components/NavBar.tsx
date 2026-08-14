"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Settings, Sparkles } from "lucide-react";

export default function NavBar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 bg-brand-primary text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-brand-accent text-brand-primary flex items-center justify-center">
              <Building2 size={18} strokeWidth={2.5} />
            </span>
            <span className="text-[15px]">
              Real Estate <span className="text-brand-accent-light">Genie</span>
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
            className="hidden md:flex items-center gap-1.5 bg-brand-accent text-brand-primary text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-accent-light transition-colors"
          >
            <Sparkles size={15} /> New Project
          </Link>

          <Link
            href="/projects/new"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-brand-accent text-brand-primary"
            aria-label="New project"
          >
            <Sparkles size={16} />
          </Link>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-brand-border flex items-stretch h-16">
        <MobileTab href="/" label="Dashboard" active={isActive("/")} icon={<LayoutDashboard size={20} />} />
        <MobileTab href="/settings" label="Settings" active={isActive("/settings")} icon={<Settings size={20} />} />
      </nav>
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
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
      className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
        active ? "text-brand-primary" : "text-brand-muted"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
