import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="py-10 border-t border-white/[0.06]" style={{ background: "var(--ai-surface)" }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, var(--ai-violet), var(--ai-cyan))" }}
          >
            <Sparkles size={14} strokeWidth={2.5} />
          </span>
          <span className="text-sm text-white/60">
            Real Estate Genie — <span className="text-white/35">AI Buyer Intelligence for Real Estate</span>
          </span>
        </div>
        <div className="flex items-center gap-5 text-xs text-white/40">
          <a href="#how-it-works" className="hover:text-white/70">
            How It Works
          </a>
          <a href="#pricing" className="hover:text-white/70">
            Pricing
          </a>
          <Link href="/login" className="hover:text-white/70">
            Sign In
          </Link>
        </div>
      </div>
    </footer>
  );
}
