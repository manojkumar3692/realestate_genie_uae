import Link from "next/link";
import { Sparkles } from "lucide-react";

const LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#teams", label: "For Teams" },
  { href: "#pricing", label: "Pricing" },
];

export default function LandingNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 ai-glass-card border-b-0">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-[0_4px_16px_rgba(109,94,245,0.4)] transition-transform group-hover:scale-105 group-hover:rotate-3"
            style={{ background: "linear-gradient(135deg, var(--ai-violet), var(--ai-cyan))" }}
          >
            <Sparkles size={17} strokeWidth={2.5} />
          </span>
          <span className="text-[16px] font-ai-display font-semibold tracking-tight text-[var(--ai-ink)]">
            Real Estate <span className="ai-gradient-text italic">Genie</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="px-3 py-2 rounded-lg text-[13px] font-medium text-[var(--ai-ink)]/65 hover:text-[var(--ai-ink)] transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {isLoggedIn ? (
            <Link href="/dashboard" className="ai-btn-primary !py-2 !px-4 !text-[13px]">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[13px] font-medium text-[var(--ai-ink)]/70 hover:text-[var(--ai-ink)] px-3 py-2 hidden sm:inline-block">
                Sign In
              </Link>
              <Link href="/signup" className="ai-btn-primary !py-2 !px-4 !text-[13px]">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
