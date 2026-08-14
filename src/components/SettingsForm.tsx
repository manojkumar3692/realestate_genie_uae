"use client";

import { useRef, useState } from "react";
import { FirmSettingsInput } from "@/lib/types";
import { Field, TextInput, TextArea } from "./workspace/formFields";
import { Check, Loader2, Save, X } from "lucide-react";

export default function SettingsForm({ initial }: { initial: FirmSettingsInput }) {
  const [firm, setFirm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function patch(p: Partial<FirmSettingsInput>) {
    setFirm({ ...firm, ...p });
    setSaved(false);
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ logoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/firm-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firm),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Firm Name">
          <TextInput value={firm.firmName} onChange={(e) => patch({ firmName: e.target.value })} />
        </Field>
        <Field label="RERA Broker No.">
          <TextInput value={firm.reraBrokerNumber} onChange={(e) => patch({ reraBrokerNumber: e.target.value })} />
        </Field>
        <Field label="Agent Name">
          <TextInput value={firm.agentName} onChange={(e) => patch({ agentName: e.target.value })} />
        </Field>
        <Field label="Agent Title">
          <TextInput value={firm.agentTitle} onChange={(e) => patch({ agentTitle: e.target.value })} />
        </Field>
        <Field label="Phone">
          <TextInput value={firm.agentPhone} onChange={(e) => patch({ agentPhone: e.target.value })} />
        </Field>
        <Field label="WhatsApp Number">
          <TextInput value={firm.agentWhatsapp} onChange={(e) => patch({ agentWhatsapp: e.target.value })} />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <TextInput type="email" value={firm.agentEmail} onChange={(e) => patch({ agentEmail: e.target.value })} />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Primary Color">
          <div className="flex items-center gap-2">
            <input type="color" value={firm.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} className="w-10 h-10 rounded border border-brand-border" />
            <TextInput value={firm.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} />
          </div>
        </Field>
        <Field label="Accent Color">
          <div className="flex items-center gap-2">
            <input type="color" value={firm.accentColor} onChange={(e) => patch({ accentColor: e.target.value })} className="w-10 h-10 rounded border border-brand-border" />
            <TextInput value={firm.accentColor} onChange={(e) => patch({ accentColor: e.target.value })} />
          </div>
        </Field>
      </div>

      <Field label="Logo">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="text-sm" />
        {firm.logoDataUrl && (
          <div className="mt-2 relative w-40 h-16 rounded-lg overflow-hidden border border-brand-border bg-brand-primary flex items-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={firm.logoDataUrl} alt="Logo preview" className="max-h-10" />
            <button onClick={() => patch({ logoDataUrl: null })} type="button" className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1">
              <X size={12} />
            </button>
          </div>
        )}
      </Field>

      <Field label="PDF Disclaimer Text">
        <TextArea rows={4} value={firm.disclaimerText} onChange={(e) => patch({ disclaimerText: e.target.value })} />
      </Field>

      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
        {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
        {saved ? "Saved" : "Save Settings"}
      </button>
    </div>
  );
}
