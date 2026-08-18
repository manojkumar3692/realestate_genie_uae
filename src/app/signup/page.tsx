import Link from "next/link";
import { Building2, Check } from "lucide-react";
import { signupAction } from "@/lib/auth/actions";
import { getPlan, isPlanKey, formatPlanPrice, type Region } from "@/lib/pricing/config";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; plan?: string; region?: string }> }) {
  const { error, plan: planParam, region: regionParam } = await searchParams;
  const planKey = isPlanKey(planParam) ? planParam : "individual";
  const plan = getPlan(planKey);
  const region: Region = regionParam?.toUpperCase() === "IN" ? "IN" : "AE";

  return (
    <div className="min-h-screen gradient-hero texture-dots flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-6">
          <span className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-[0_2px_10px_rgba(54,38,217,0.4)]">
            <Building2 size={22} strokeWidth={2.5} />
          </span>
          <h1 className="text-2xl font-display font-semibold text-white">
            Real Estate <span className="text-brand-accent">Genie</span>
          </h1>
          <p className="text-white/60 text-sm text-center">
            Set up your agency. You'll be the first admin — invite your team afterwards.
          </p>
        </div>

        <div className="glass-surface rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wide">{plan.name} plan</p>
            <p className="text-white text-sm font-semibold">{formatPlanPrice(plan, region)}/month</p>
          </div>
          <div className="flex gap-3 text-xs">
            <Link href={`/signup?plan=individual&region=${region}`} className={planKey === "individual" ? "text-brand-accent-light font-semibold" : "text-white/50"}>
              Individual
            </Link>
            <Link href={`/signup?plan=team&region=${region}`} className={planKey === "team" ? "text-brand-accent-light font-semibold" : "text-white/50"}>
              Team
            </Link>
          </div>
        </div>

        <form action={signupAction} className="card-surface p-6 flex flex-col gap-4">
          {error && <p className="text-sm text-hot bg-hot-tint rounded-lg px-3 py-2">{error}</p>}
          <input type="hidden" name="plan" value={planKey} />
          <div>
            <label className="label-text">Agency name</label>
            <input name="orgName" required className="input-field" placeholder="e.g. Skyline Properties" />
          </div>
          <div>
            <label className="label-text">Your name</label>
            <input name="name" required className="input-field" placeholder="Ahmed Khan" />
          </div>
          <div>
            <label className="label-text">Email</label>
            <input name="email" type="email" required className="input-field" placeholder="you@agency.com" />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input name="password" type="password" required minLength={8} className="input-field" placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="label-text">Region</label>
            <div className="flex gap-4 text-sm mt-1">
              <label className="flex items-center gap-1.5">
                <input type="radio" name="region" value="AE" defaultChecked={region === "AE"} /> UAE
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="region" value="IN" defaultChecked={region === "IN"} /> India
              </label>
            </div>
          </div>
          <ul className="text-xs text-brand-muted flex flex-col gap-1">
            {plan.features.slice(0, 3).map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <Check size={12} className="text-brand-positive shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <button type="submit" className="btn-primary w-full mt-2">
            Create agency account
          </button>
          <p className="text-sm text-brand-muted text-center">
            Already set up?{" "}
            <Link href="/login" className="text-brand-primary font-semibold">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
