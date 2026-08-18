import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="ai-bg py-8 border-t border-[var(--ai-border)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{ background: "var(--ai-ink)" }}>
            <Sparkles size={12} strokeWidth={2.5} />
          </span>
          <span className="text-[13px] text-[var(--ai-ink-soft)]">Real Estate Genie</span>
        </div>
        <div className="flex items-center gap-5 text-[12px] text-[var(--ai-ink-faint)] flex-wrap justify-center">
          <a href="#how-it-works" className="hover:text-[var(--ai-ink)] transition-colors">
            How It Works
          </a>
          <a href="#teams" className="hover:text-[var(--ai-ink)] transition-colors">
            For Teams
          </a>
          <a href="#pricing" className="hover:text-[var(--ai-ink)] transition-colors">
            Pricing
          </a>
          <span className="hover:text-[var(--ai-ink)] transition-colors cursor-default">Privacy</span>
          <span className="hover:text-[var(--ai-ink)] transition-colors cursor-default">Terms</span>
          <Link href="/login" className="hover:text-[var(--ai-ink)] transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </footer>
  );
}
