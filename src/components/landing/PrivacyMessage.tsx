export default function PrivacyMessage() {
  return (
    <section className="relative ai-bg border-y border-[var(--ai-border)] py-16 md:py-20">
      <div className="max-w-2xl mx-auto px-4 md:px-6 text-center">
        <h2 className="font-ai-display font-semibold text-2xl md:text-3xl tracking-tight text-[var(--ai-ink)]">Your leads stay your leads.</h2>
        <p className="text-[var(--ai-ink)]/55 text-sm md:text-base mt-4 leading-relaxed">
          Your buyer data is one of your most valuable assets. That&apos;s why Team accounts don&apos;t create an open company customer database.
          Each agent&apos;s buyers stay inside their private workspace. The team shares projects and opportunity intelligence — not customer lists.
        </p>
      </div>
    </section>
  );
}
