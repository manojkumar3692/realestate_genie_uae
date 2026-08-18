"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Users, FolderKanban, Sparkles, Search, LogOut, PhoneCall } from "lucide-react";
import { motion } from "framer-motion";
import { logoutAction } from "@/lib/auth/actions";

const DESKTOP_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/projects", label: "Projects" },
  { href: "/contact-today", label: "Contact Today" },
  { href: "/intelligence/sources", label: "Sources" },
  { href: "/analytics", label: "Outcomes" },
];

const MOBILE_TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/contact-today", label: "Today", icon: PhoneCall },
];

export default function NavBar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => (href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href));

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    if (q) router.push(`/search?q=${encodeURIComponent(String(q))}`);
  }

  return (
    <>
      <header className="sticky top-0 z-40 ai-glass-card border-b-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
            <span className="w-9 h-9 rounded-lg bg-[var(--ai-ink)] text-white flex items-center justify-center transition-transform group-hover:scale-105">
              <Building2 size={18} strokeWidth={2.5} />
            </span>
            <span className="text-[16px] font-display font-semibold tracking-tight text-[var(--ai-ink)] hidden sm:inline">
              Real Estate <span className="ai-mark">Genie</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {DESKTOP_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} active={isActive(link.href)}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-xs relative">
            <Search size={14} className="absolute left-3 text-[var(--ai-ink-faint)]" />
            <input
              name="q"
              placeholder="Search leads, projects…"
              className="w-full bg-[var(--ai-bg-deep)] text-[var(--ai-ink)] placeholder-[var(--ai-ink-faint)] text-sm rounded-lg pl-8 pr-3 py-2 border border-[var(--ai-border)] focus:outline-none focus:border-[var(--ai-accent)] transition-colors"
            />
          </form>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/projects/new" className="hidden md:inline-flex ai-btn-primary !py-2 !px-4 !text-[11px] items-center gap-1.5">
              <Sparkles size={13} /> Add Project
            </Link>
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-[var(--ai-border)]">
              <span className="text-xs text-[var(--ai-ink-faint)] max-w-[140px] truncate" title={userEmail}>
                {userName || userEmail}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-[var(--ai-ink-faint)] hover:text-[var(--ai-ink)] p-1.5 rounded-lg hover:bg-[rgba(21,19,14,0.06)] transition-colors"
                  title="Log out"
                >
                  <LogOut size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[var(--ai-border)] flex items-stretch h-[68px] shadow-[0_-4px_16px_rgba(21,19,14,0.06)]">
        {MOBILE_TABS.map((tab) => (
          <MobileTab key={tab.href} href={tab.href} label={tab.label} active={isActive(tab.href)} icon={<tab.icon size={19} />} />
        ))}
        <Link href="/projects/new" className="flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--ai-accent)]">
          <Sparkles size={19} />
          Add
        </Link>
      </nav>
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className="relative px-3 py-2 rounded-lg text-[13px] font-medium">
      <span
        className={`relative z-10 transition-colors ${active ? "text-[var(--ai-ink)]" : "text-[var(--ai-ink-faint)] hover:text-[var(--ai-ink)]"}`}
      >
        {children}
      </span>
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          className="absolute inset-0 bg-[var(--ai-accent-soft)] rounded-lg"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
    </Link>
  );
}

function MobileTab({ href, label, active, icon }: { href: string; label: string; active: boolean; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
        active ? "text-[var(--ai-accent)]" : "text-[var(--ai-ink-faint)]"
      }`}
    >
      <span className={`transition-transform ${active ? "scale-110" : ""}`}>{icon}</span>
      {label}
    </Link>
  );
}
