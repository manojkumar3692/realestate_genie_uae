"use client";

import { Download, Mail, MessageCircle, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function ShareButtons({
  downloadUrl,
  projectName,
  clientName,
  clientPhone,
  clientEmail,
  agentName,
}: {
  downloadUrl: string;
  projectName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  agentName: string;
}) {
  const [copied, setCopied] = useState(false);

  const absoluteUrl = typeof window !== "undefined" ? `${window.location.origin}${downloadUrl}` : downloadUrl;

  const greeting = clientName ? `Hi ${clientName},` : "Hi,";
  const message = `${greeting} here's the investment overview for ${projectName} — ${absoluteUrl}\n\nLet me know if you'd like to discuss further.\n${agentName ? `— ${agentName}` : ""}`;

  const whatsappHref = `https://wa.me/${sanitizePhone(clientPhone)}?text=${encodeURIComponent(message)}`;
  const mailtoHref = `mailto:${clientEmail}?subject=${encodeURIComponent(
    `Investment Opportunity: ${projectName}`
  )}&body=${encodeURIComponent(message)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(absoluteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <a href={downloadUrl} target="_blank" rel="noreferrer" className="btn-primary flex items-center gap-2 text-sm">
          <Download size={15} /> Download PDF
        </a>
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg bg-[#25D366] text-white hover:opacity-90 transition-opacity">
          <MessageCircle size={15} /> Share via WhatsApp
        </a>
        <a href={mailtoHref} className="btn-secondary flex items-center gap-2 text-sm">
          <Mail size={15} /> Share via Email
        </a>
        <button onClick={copyLink} type="button" className="btn-secondary flex items-center gap-2 text-sm">
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
      <p className="text-[11px] text-brand-muted">
        The download link points to this app's server — it works as long as this app stays running and reachable by
        your client. For a permanent public link, deploy the app or attach the downloaded PDF file directly in
        WhatsApp/Email instead of sharing the link.
      </p>
    </div>
  );
}

function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}
