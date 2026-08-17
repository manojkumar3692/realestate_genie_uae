import Link from "next/link";
import { Building2 } from "lucide-react";
import { signupAction } from "@/lib/auth/actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="min-h-screen gradient-hero texture-dots flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-accent-light to-brand-accent text-brand-primary-dark flex items-center justify-center shadow-[0_2px_8px_rgba(201,162,75,0.4)]">
            <Building2 size={22} strokeWidth={2.5} />
          </span>
          <h1 className="text-2xl font-display font-semibold text-white">
            Real Estate <span className="text-brand-accent-light italic">Genie</span>
          </h1>
          <p className="text-white/60 text-sm text-center">
            Set up your agency. You'll be the first admin — invite your team afterwards.
          </p>
        </div>

        <form action={signupAction} className="card-surface p-6 flex flex-col gap-4">
          {error && <p className="text-sm text-hot bg-hot-tint rounded-lg px-3 py-2">{error}</p>}
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
