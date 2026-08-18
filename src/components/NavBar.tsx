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
      <header className="sticky top-0 z-40 glass-surface border-b border-white/10 shadow-[0_4px_20px_rgba(7,39,34,0.18)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-accent-light to-brand-accent text-brand-primary-dark flex items-center justify-center shadow-[0_2px_8px_rgba(201,162,75,0.4)] transition-transform group-hover:scale-105 group-hover:rotate-3">
              <Building2 size={18} strokeWidth={2.5} />
            </span>
            <span className="text-[16px] font-display font-semibold tracking-tight text-white hidden sm:inline">
              Real Estate <span className="text-brand-accent-light italic">Genie</span>
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
            <Search size={14} className="absolute left-3 text-white/50" />
            <input
              name="q"
              placeholder="Search leads, projects…"
              className="w-full bg-white/10 text-white placeholder-white/50 text-sm rounded-lg pl-8 pr-3 py-2 border border-white/10 focus:outline-none focus:border-brand-accent-light/60"
            />
          </form>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/projects/new"
              className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-brand-accent-light to-brand-accent text-brand-primary-dark text-sm font-semibold px-4 py-2 rounded-lg shadow-[0_2px_10px_rgba(201,162,75,0.35)] transition-all hover:shadow-[0_4px_16px_rgba(201,162,75,0.5)] hover:-translate-y-0.5"
            >
              <Sparkles size={15} /> Add Project
            </Link>
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-white/15">
              <span className="text-xs text-white/70 max-w-[140px] truncate" title={userEmail}>
                {userName || userEmail}
              </span>
              <form action={logoutAction}>
                <button type="submit" className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10" title="Log out">
                  <LogOut size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-brand-border flex items-stretch h-[68px] shadow-[0_-4px_16px_rgba(15,35,32,0.06)]">
        {MOBILE_TABS.map((tab) => (
          <MobileTab key={tab.href} href={tab.href} label={tab.label} active={isActive(tab.href)} icon={<tab.icon size={19} />} />
        ))}
        <Link
          href="/projects/new"
          className="flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-brand-accent-dark"
        >
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
      <span className={`relative z-10 transition-colors ${active ? "text-white" : "text-white/65 hover:text-white"}`}>{children}</span>
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

function MobileTab({ href, label, active, icon }: { href: string; label: string; active: boolean; icon: React.ReactNode }) {
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
