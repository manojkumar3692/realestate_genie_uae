import type { ColumnDetection } from "./detectColumns";
import { normalizeUaePhone } from "@/lib/normalize/phone";
import { parseBudget, type ParsedBudget } from "@/lib/normalize/budget";
import { normalizeLocation } from "@/lib/normalize/location";
import { normalizeSource, type NormalizedSource } from "@/lib/normalize/source";
import { normalizeWhitespace } from "@/lib/normalize/text";

export type Purpose = "investment" | "end_use" | "holiday_home" | "unclear";
export type ReadyOffplan = "ready" | "off_plan" | "either";
export type Readiness = "immediate" | "warm" | "cold" | "unknown";

export interface NormalizedRow {
  name: string;
  rawPhone: string;
  normalizedPhone: string;
  isUaeMobile: boolean;
  email: string;
  normalizedEmail: string;
  nationality: string;
  source: NormalizedSource;
  campaignRaw: string;
  interestedProjects: string[];
  preferredLocations: string[];
  preferredDevelopers: string[];
  budget: ParsedBudget;
  bedrooms: string[];
  propertyTypes: string[];
  purpose: Purpose;
  purchaseTimeline: string;
  paymentPlanPreference: string;
  readyOrOffplanPreference: ReadyOffplan;
  purchaseReadiness: Readiness;
  previousStatus: string;
  lostReason: string;
  agentNotes: string;
  leadCreatedDate: Date | null;
  lastContactedDate: Date | null;
}

function splitMultiValue(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;/|]|\band\b|\n/i)
    .map((s) => normalizeWhitespace(s))
    .filter(Boolean)
    .filter((v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);
}

function parseDate(raw: string): Date | null {
  if (!raw || !raw.trim()) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function inferPurpose(...texts: string[]): Purpose {
  const combined = texts.join(" ").toLowerCase();
  if (!combined.trim()) return "unclear";
  if (/\b(holiday home|vacation home|second home)\b/.test(combined)) return "holiday_home";
  if (/\b(invest(or|ment)?|rental yield|capital appreciation|flip|resale)\b/.test(combined)) return "investment";
  if (/\b(end.?user|own use|to live|for living|self ?use|family home)\b/.test(combined)) return "end_use";
  return "unclear";
}

function inferReadyOffplan(...texts: string[]): ReadyOffplan {
  const combined = texts.join(" ").toLowerCase();
  const wantsReady = /\bready\b/.test(combined) && !/\boff.?plan\b/.test(combined);
  const wantsOffplan = /\boff.?plan\b/.test(combined) && !/\bready\b/.test(combined);
  if (wantsReady) return "ready";
  if (wantsOffplan) return "off_plan";
  return "either";
}

function inferReadiness(...texts: string[]): Readiness {
  const combined = texts.join(" ").toLowerCase();
  if (!combined.trim()) return "unknown";
  if (/\b(not interested|lost|no budget|cold lead|do not contact|invalid|opted out)\b/.test(combined)) return "cold";
  if (/\b(asap|immediately|ready to buy|buy now|ready now|urgent)\b/.test(combined)) return "immediate";
  if (/\b(\d+\s*(-|to)?\s*\d*\s*(month|week)s?|later|maybe|considering|thinking)\b/.test(combined)) return "warm";
  return "unknown";
}

/** Maps one raw imported row into the normalized (deterministic) customer shape, using only accepted column mappings. */
export function normalizeRow(row: Record<string, string>, mappings: ColumnDetection[]): NormalizedRow {
  const get = (field: string): string => {
    const cols = mappings.filter((m) => m.detectedField === field);
    return cols
      .map((c) => row[c.sourceColumn] || "")
      .filter(Boolean)
      .join(" | ");
  };

  const phoneRaw = get("phone");
  const phoneNorm = normalizeUaePhone(phoneRaw);
  const budgetText = get("budget");
  const purposeText = get("purpose");
  const timelineText = get("purchase_timeline");
  const readinessText = get("purchase_readiness");
  const readyOffplanText = get("ready_or_offplan_preference");
  const statusText = get("previous_status");
  const notesText = get("agent_notes");

  return {
    name: normalizeWhitespace(get("name")),
    rawPhone: phoneRaw,
    normalizedPhone: phoneNorm.normalized,
    isUaeMobile: phoneNorm.isUaeMobile,
    email: normalizeWhitespace(get("email")),
    normalizedEmail: get("email").trim().toLowerCase(),
    nationality: normalizeWhitespace(get("nationality")),
    source: normalizeSource(get("lead_source")),
    campaignRaw: normalizeWhitespace(get("campaign")),
    interestedProjects: splitMultiValue(get("interested_project")),
    preferredLocations: splitMultiValue(get("preferred_location")).map((l) => normalizeLocation(l).canonical),
    preferredDevelopers: splitMultiValue(get("preferred_developer")),
    budget: parseBudget(budgetText),
    bedrooms: splitMultiValue(get("bedrooms")),
    propertyTypes: splitMultiValue(get("property_type")),
    purpose: inferPurpose(purposeText, notesText),
    purchaseTimeline: normalizeWhitespace(timelineText),
    paymentPlanPreference: normalizeWhitespace(get("payment_plan_preference")),
    readyOrOffplanPreference: inferReadyOffplan(readyOffplanText, notesText),
    purchaseReadiness: inferReadiness(readinessText, timelineText, statusText, notesText),
    previousStatus: normalizeWhitespace(statusText),
    lostReason: normalizeWhitespace(get("lost_reason")),
    agentNotes: normalizeWhitespace(notesText),
    leadCreatedDate: parseDate(get("lead_created_date")),
    lastContactedDate: parseDate(get("last_contacted_date")),
  };
}
