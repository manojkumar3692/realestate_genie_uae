import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/requireSession";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { inviteTeammateAction } from "@/lib/auth/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function TeamSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await requireAdmin();
  const teammates = await db.query.users.findMany({ where: eq(users.orgId, session.orgId) });

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col gap-8">
      <div>
        <p className="label-text mb-1">Team Settings</p>
        <h1 className="text-2xl md:text-3xl font-display font-semibold mb-2">Your team</h1>
        <p className="text-brand-muted text-sm">Admins can manage imports, projects, and invite teammates. Users can use projects and matching.</p>
      </div>

      <div className="card-surface divide-y divide-brand-border">
        {teammates.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-sm">{t.name}</p>
              <p className="text-xs text-brand-muted">{t.email}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-brand-cream text-brand-muted capitalize">{t.role}</span>
          </div>
        ))}
      </div>

      <div>
        <p className="label-text mb-3">Invite a teammate</p>
        {error && <p className="text-sm text-hot bg-hot-tint rounded-lg px-3 py-2 mb-4">{error}</p>}
        <form action={inviteTeammateAction} className="card-surface p-5 grid md:grid-cols-2 gap-4">
          <div>
            <label className="label-text">Name</label>
            <input name="name" required className="input-field" />
          </div>
          <div>
            <label className="label-text">Email</label>
            <input name="email" type="email" required className="input-field" />
          </div>
          <div>
            <label className="label-text">Temporary password</label>
            <input name="password" type="password" required minLength={8} className="input-field" />
          </div>
          <div>
            <label className="label-text">Role</label>
            <select name="role" className="input-field">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <SubmitButton label="Invite Teammate" pendingLabel="Inviting…" className="btn-primary" />
          </div>
        </form>
      </div>
    </div>
  );
}
