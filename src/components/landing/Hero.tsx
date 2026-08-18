import Link from "next/link";
import BuyerDataField from "./BuyerDataField";

export default function Hero() {
  return (
    <section className="relative ai-bg overflow-hidden">
      <div className="ai-grid-bg absolute inset-0" />

      <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 pt-14 pb-16 md:pt-20 md:pb-0 grid md:grid-cols-12 gap-10 md:gap-4 items-center">
        {/* Text sits in the left third — asymmetric on purpose, the data field is the star */}
        <div className="md:col-span-5 md:col-start-1 relative z-10">
          <span className="ai-badge ai-badge-accent mb-6">AI Buyer Intelligence for Real Estate</span>
          <h1 className="font-ai-display font-semibold uppercase text-[var(--ai-ink)] text-[2.6rem] leading-[1.02] md:text-[3.4rem] lg:text-[3.75rem] md:leading-[0.98] tracking-tight">
            Your next buyer
            <br />
            may already be
            <br />
            <span className="ai-mark">in your old leads.</span>
          </h1>
          <p className="text-[var(--ai-ink-soft)] text-base md:text-lg mt-6 max-w-sm leading-relaxed">
            Upload your old leads. Add today&apos;s project. AI finds the buyers worth contacting again — and tells you why.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link href="/signup" className="ai-btn-primary">
              Find Buyers In My Leads
            </Link>
            <a href="#how-it-works" className="ai-btn-secondary">
              See It In Action
            </a>
          </div>
          <p className="text-[var(--ai-ink-faint)] text-[11px] mt-7 tracking-wide uppercase">
            CSV + Excel · No CRM migration · Your leads stay private
          </p>
        </div>

        {/* The data field bleeds wide across the right two-thirds, overlapping the text column
            slightly on large screens so the scene reads as the true subject of the hero. */}
        <div className="md:col-span-8 md:col-start-5 relative">
          <BuyerDataField />
        </div>
      </div>
    </section>
  );
}
