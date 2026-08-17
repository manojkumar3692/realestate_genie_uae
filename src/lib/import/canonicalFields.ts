/**
 * The internal normalized schema every arbitrary CRM export gets mapped into.
 * Column mapping (src/lib/import/detectColumns.ts) never assumes a fixed
 * source template — it maps whatever headers show up onto this list.
 */

export type CanonicalFieldKey =
  | "name"
  | "phone"
  | "email"
  | "nationality"
  | "lead_source"
  | "campaign"
  | "interested_project"
  | "preferred_location"
  | "preferred_developer"
  | "budget"
  | "bedrooms"
  | "property_type"
  | "purpose"
  | "purchase_timeline"
  | "payment_plan_preference"
  | "ready_or_offplan_preference"
  | "purchase_readiness"
  | "previous_status"
  | "lost_reason"
  | "agent_notes"
  | "lead_created_date"
  | "last_contacted_date"
  | "unmapped";

export interface CanonicalFieldDef {
  key: CanonicalFieldKey;
  label: string;
  description: string;
  /** Normalized (lowercased, de-punctuated) exact/substring aliases. */
  aliases: string[];
  /** Optional heuristic that inspects sample cell values and returns a 0-1 confidence boost. */
  valueHeuristic?: (samples: string[]) => number;
  multiValue?: boolean;
}

const isLikelyPhone = (s: string) => /^[\d+\s().-]{7,20}$/.test(s.trim()) && /\d{6,}/.test(s.replace(/\D/g, ""));
const isLikelyEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isLikelyDate = (s: string) =>
  /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(s.trim()) || !Number.isNaN(Date.parse(s.trim()));
const isLikelyBudget = (s: string) =>
  /\b(aed|usd|inr|\$|₹|k|m|mn|million|lakh|lac|crore|cr)\b/i.test(s) || /\d{5,}/.test(s.replace(/[,\s]/g, ""));
const isLikelyBedrooms = (s: string) => /\b(studio|\d\s?(br|bed|bhk|bedroom))\b/i.test(s.trim());

function heuristicRatio(samples: string[], test: (s: string) => boolean): number {
  const usable = samples.filter((s) => s && s.trim());
  if (usable.length === 0) return 0;
  const hits = usable.filter(test).length;
  return hits / usable.length;
}

export const CANONICAL_FIELDS: CanonicalFieldDef[] = [
  {
    key: "name",
    label: "Customer Name",
    description: "The buyer's full name",
    aliases: ["name", "customer name", "cust name", "client name", "full name", "lead name", "contact name"],
  },
  {
    key: "phone",
    label: "Phone",
    description: "Mobile / contact number",
    aliases: ["phone", "mobile", "mob", "mob1", "contact no", "contact number", "cell", "whatsapp", "tel"],
    valueHeuristic: (s) => heuristicRatio(s, isLikelyPhone) * 0.6,
  },
  {
    key: "email",
    label: "Email",
    description: "Email address",
    aliases: ["email", "e mail", "email address", "mail id"],
    valueHeuristic: (s) => heuristicRatio(s, isLikelyEmail) * 0.6,
  },
  {
    key: "nationality",
    label: "Nationality",
    description: "Customer nationality",
    aliases: ["nationality", "nation", "country"],
  },
  {
    key: "lead_source",
    label: "Lead Source",
    description: "Where the lead came from",
    aliases: ["source", "lead source", "lead src", "channel", "acquisition source", "platform"],
  },
  {
    key: "campaign",
    label: "Campaign",
    description: "Marketing campaign name",
    aliases: ["campaign", "campaign name", "ad campaign", "meta campaign", "google campaign", "utm campaign"],
  },
  {
    key: "interested_project",
    label: "Interested Project",
    description: "Project(s) the customer previously enquired about",
    aliases: ["project", "proj int", "interested project", "project interest", "property interest", "enquired project"],
    multiValue: true,
  },
  {
    key: "preferred_location",
    label: "Preferred Location",
    description: "Preferred area / community",
    aliases: ["location", "preferred location", "area", "community", "region", "preferred area"],
    multiValue: true,
  },
  {
    key: "preferred_developer",
    label: "Preferred Developer",
    description: "Preferred developer",
    aliases: ["developer", "preferred developer", "builder"],
    multiValue: true,
  },
  {
    key: "budget",
    label: "Budget",
    description: "Budget or budget range",
    aliases: ["budget", "bgt", "budget range", "price range", "max budget", "investment amount"],
    valueHeuristic: (s) => heuristicRatio(s, isLikelyBudget) * 0.5,
  },
  {
    key: "bedrooms",
    label: "Bedrooms / Unit Type",
    description: "Bedroom count or unit type (Studio, 1BR, 2BR...)",
    aliases: ["bedroom", "bedrooms", "br", "unit type", "bhk", "beds"],
    valueHeuristic: (s) => heuristicRatio(s, isLikelyBedrooms) * 0.6,
    multiValue: true,
  },
  {
    key: "property_type",
    label: "Property Type",
    description: "Apartment, villa, townhouse...",
    aliases: ["property type", "unit category", "type of property"],
    multiValue: true,
  },
  {
    key: "purpose",
    label: "Investor / End-user",
    description: "Investment vs end-use intent",
    aliases: ["purpose", "investor end user", "investment or end use", "buyer type", "intent"],
  },
  {
    key: "purchase_timeline",
    label: "Purchase Timeline",
    description: "When the customer intends to buy",
    aliases: ["timeline", "purchase timeline", "buying timeline", "readiness time", "time frame"],
  },
  {
    key: "payment_plan_preference",
    label: "Payment Plan Preference",
    description: "Payment plan sensitivity",
    aliases: ["payment plan", "payment preference", "pp preference", "downpayment preference"],
  },
  {
    key: "ready_or_offplan_preference",
    label: "Ready / Off-plan Preference",
    description: "Ready vs off-plan preference",
    aliases: ["ready or offplan", "ready off plan", "handover preference", "construction status preference"],
  },
  {
    key: "purchase_readiness",
    label: "Purchase Readiness",
    description: "How close to buying",
    aliases: ["readiness", "purchase readiness", "buyer readiness", "urgency"],
  },
  {
    key: "previous_status",
    label: "Status",
    description: "CRM pipeline status",
    aliases: ["status", "lead status", "stage", "pipeline stage"],
  },
  {
    key: "lost_reason",
    label: "Lost Reason",
    description: "Why the deal was lost, if applicable",
    aliases: ["lost reason", "reason lost", "loss reason", "objection"],
  },
  {
    key: "agent_notes",
    label: "Agent Notes",
    description: "Free-text remarks / call notes",
    aliases: ["notes", "remarks", "sales rem", "agent notes", "comments", "call notes", "conversation"],
  },
  {
    key: "lead_created_date",
    label: "Lead Created Date",
    description: "When the lead first entered the CRM",
    aliases: ["created on", "created date", "lead date", "date created", "inquiry date", "enquiry date"],
    valueHeuristic: (s) => heuristicRatio(s, isLikelyDate) * 0.5,
  },
  {
    key: "last_contacted_date",
    label: "Last Contacted Date",
    description: "Most recent contact date",
    aliases: ["last contacted", "last contact date", "last activity", "last follow up"],
    valueHeuristic: (s) => heuristicRatio(s, isLikelyDate) * 0.4,
  },
];

export const CANONICAL_FIELD_BY_KEY = new Map(CANONICAL_FIELDS.map((f) => [f.key, f]));
