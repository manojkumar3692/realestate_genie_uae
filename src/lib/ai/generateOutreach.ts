import { getAiProvider } from "./provider";

export interface OutreachInput {
  customerId: string;
  customerName: string;
  matchSummary: string; // why they matched, in plain language
  projectName: string;
  agentName?: string;
}

export interface OutreachResult {
  customerId: string;
  callOpening: string;
  whatsappMessage: string;
}

const SYSTEM_PROMPT = `You write short, natural real-estate reactivation outreach for a UAE agent to use themselves — NOT to send automatically. Given why an old lead matches a new project, write:
1. "callOpening" — a natural 2-3 sentence phone call opener, referencing their specific past interest and how this project addresses it.
2. "whatsappMessage" — a friendly, brief WhatsApp message (not a call opener, more casual, 2-4 sentences), same idea.
Avoid generic salesy language. Be specific to the match reason given. Respond with strict JSON: {"results": [{"customerId": string, "callOpening": string, "whatsappMessage": string}]}`;

export async function generateOutreachMessages(inputs: OutreachInput[]): Promise<Map<string, OutreachResult>> {
  const results = new Map<string, OutreachResult>();
  const provider = getAiProvider();
  if (!provider.configured || inputs.length === 0) return results;

  const user = JSON.stringify(inputs);
  const response = await provider.completeJson<{ results: OutreachResult[] }>({
    system: SYSTEM_PROMPT,
    user,
    maxOutputTokens: 1800,
  });
  for (const r of response?.results ?? []) {
    if (r?.customerId) results.set(r.customerId, r);
  }
  return results;
}

/** Deterministic fallback used whenever no AI key is configured, or the AI call fails. */
export function templateOutreach(input: OutreachInput): OutreachResult {
  const firstName = input.customerName.split(" ")[0] || "there";
  return {
    customerId: input.customerId,
    callOpening: `Hi ${firstName}, this is ${input.agentName || "your agent"} from our team. You'd previously shown interest that matches what we're seeing here — ${input.matchSummary}. We just received ${input.projectName}, and I thought it might be relevant for you. Do you have a couple of minutes to hear more?`,
    whatsappMessage: `Hi ${firstName}! Following up from before — ${input.matchSummary}. We just launched ${input.projectName} and it looked like a strong fit for what you were after. Want me to send a few more details?`,
  };
}
