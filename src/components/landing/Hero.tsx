import Link from "next/link";
import HeroVisual from "./HeroVisual";

export default function Hero() {
  return (
    <section className="relative ai-bg overflow-hidden">
      <div className="ai-grid-bg absolute inset-0 h-[640px]" />
      <div className="ai-orb ai-pulse w-[420px] h-[420px] -top-32 -left-32" style={{ background: "var(--ai-violet)" }} />
      <div className="ai-orb ai-pulse w-[360px] h-[360px] top-10 right-0" style={{ background: "var(--ai-cyan)", animationDelay: "2s" }} />

      <div className="relative max-w-6xl mx-auto px-4 md:px-6 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-12 md:gap-8 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 ai-glass-card rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-[var(--ai-violet)] mb-6">
            AI Buyer Intelligence for Real Estate
          </span>
          <h1 className="font-ai-display font-semibold text-[var(--ai-ink)] text-[2.5rem] leading-[1.08] md:text-6xl md:leading-[1.05] tracking-tight">
            YOUR NEXT BUYER
            <br />
            MAY ALREADY BE
            <br />
            <span className="ai-gradient-text italic">IN YOUR OLD LEADS.</span>
          </h1>
          <p className="text-[var(--ai-ink)]/60 text-base md:text-lg mt-6 max-w-md leading-relaxed">
            Upload your old CRM export. Add today&apos;s property project. Our AI finds the buyers worth contacting again — and tells you why.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link href="/signup" className="ai-btn-primary text-center">
              Find Buyers In My Leads
            </Link>
            <a href="#how-it-works" className="ai-btn-secondary text-center">
              See How It Works
            </a>
          </div>
          <p className="text-[var(--ai-ink)]/40 text-xs mt-6 tracking-wide">CSV &amp; Excel · No CRM migration · Your leads stay private</p>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}
