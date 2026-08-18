import Link from "next/link";
import { Building2 } from "lucide-react";
import { loginAction } from "@/lib/auth/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="min-h-screen gradient-hero texture-dots flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <span className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-[0_2px_10px_rgba(54,38,217,0.4)]">
            <Building2 size={22} strokeWidth={2.5} />
          </span>
          <h1 className="text-2xl font-display font-semibold text-white">
            Real Estate <span className="text-brand-accent">Genie</span>
          </h1>
          <p className="text-white/60 text-sm text-center">AI buyer intelligence & lead reactivation for your agency</p>
        </div>

        <form action={loginAction} className="card-surface p-6 flex flex-col gap-4">
          {error && <p className="text-sm text-hot bg-hot-tint rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="label-text">Email</label>
            <input name="email" type="email" required className="input-field" placeholder="you@agency.com" />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input name="password" type="password" required className="input-field" placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-primary w-full mt-2">
            Log in
          </button>
          <p className="text-sm text-brand-muted text-center">
            New agency?{" "}
            <Link href="/signup" className="text-brand-primary font-semibold">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
