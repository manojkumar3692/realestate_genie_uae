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
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-transform group-hover:scale-105"
            style={{ background: "var(--ai-ink)" }}
          >
            <Sparkles size={16} strokeWidth={2.5} />
          </span>
          <span className="text-[15px] font-ai-display font-semibold tracking-tight text-[var(--ai-ink)]">
            Real Estate <span className="ai-mark">Genie</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-lg text-[13px] font-medium text-[var(--ai-ink-soft)] hover:text-[var(--ai-ink)] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {isLoggedIn ? (
            <Link href="/dashboard" className="ai-btn-primary !py-2 !px-4 !text-[11.5px]">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[13px] font-medium text-[var(--ai-ink-soft)] hover:text-[var(--ai-ink)] px-3 py-2 hidden sm:inline-block">
                Sign In
              </Link>
              <Link href="/signup" className="ai-btn-primary !py-2 !px-4 !text-[11.5px]">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
