import { getFirmSettings } from "@/db/repo";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const firm = await getFirmSettings();
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
      <h1 className="text-2xl font-bold text-brand-primary mb-1">Firm & Branding Settings</h1>
      <p className="text-sm text-brand-muted mb-6">
        This appears on every PDF you generate — logo, contact details and brand colors.
      </p>
      <SettingsForm initial={firm} />
    </div>
  );
}
