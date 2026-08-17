import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28 border-t border-white/[0.06]" style={{ background: "var(--ai-surface)" }}>
      <div className="ai-orb ai-pulse w-[420px] h-[420px] top-0 left-1/3" style={{ background: "var(--ai-violet)", opacity: 0.3 }} />
      <div className="ai-orb ai-pulse w-[360px] h-[360px] bottom-0 right-1/3" style={{ background: "var(--ai-cyan)", opacity: 0.25, animationDelay: "1.5s" }} />

      <div className="relative max-w-2xl mx-auto px-4 md:px-6 text-center">
        <h2 className="font-ai-display font-semibold text-3xl md:text-[2.5rem] text-white tracking-tight leading-tight">
          Before you buy more leads,
          <br />
          check the ones you already have.
        </h2>
        <p className="text-white/50 text-base mt-4">Your next buyer may already be sitting inside an old spreadsheet.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/signup?plan=individual" className="ai-btn-primary">
            Find Buyers In My Leads
          </Link>
          <Link href="/signup?plan=team" className="ai-btn-secondary">
            Start As A Team
          </Link>
        </div>
      </div>
    </section>
  );
}
