import { getAiProvider } from "./provider";

export interface ParsedProjectText {
  name?: string;
  developer?: string;
  city?: string;
  community?: string;
  location?: string;
  nearbyAreas?: string[];
  propertyTypes?: string[];
  bedroomTypes?: string[];
  startingPrice?: number;
  maxPrice?: number;
  currency?: string;
  paymentPlanSummary?: string;
  downPaymentPercent?: number;
  constructionStatus?: "off_plan" | "ready";
  expectedHandover?: string;
  expectedRentalYieldPercent?: number;
  expectedAppreciationPercent?: number;
  targetBuyerType?: "investor" | "end_user" | "both";
  amenities?: string[];
  sellingPoints?: string[];
  unitTypes?: Array<{
    typeLabel: string;
    bedrooms: number;
    sizeSqftMin?: number;
    sizeSqftMax?: number;
    priceFrom?: number;
    priceTo?: number;
  }>;
}

const SYSTEM_PROMPT = `You extract structured real-estate project data from pasted brochure/listing text (which may be messy marketing copy). Only fill fields you can find reasonable support for in the text — omit anything not mentioned rather than guessing. Prices should be plain numbers in the stated currency (default AED if unstated). "bedrooms" for a Studio is 0.

Respond with strict JSON matching this shape (omit any field you can't determine):
{
  "name": string, "developer": string, "city": string, "community": string, "location": string,
  "nearbyAreas": string[], "propertyTypes": string[], "bedroomTypes": string[],
  "startingPrice": number, "maxPrice": number, "currency": string,
  "paymentPlanSummary": string, "downPaymentPercent": number,
  "constructionStatus": "off_plan"|"ready", "expectedHandover": string,
  "expectedRentalYieldPercent": number, "expectedAppreciationPercent": number,
  "targetBuyerType": "investor"|"end_user"|"both",
  "amenities": string[], "sellingPoints": string[],
  "unitTypes": [{"typeLabel": string, "bedrooms": number, "sizeSqftMin": number, "sizeSqftMax": number, "priceFrom": number, "priceTo": number}]
}`;

export async function parseProjectText(rawText: string): Promise<ParsedProjectText | null> {
  const provider = getAiProvider();
  if (!provider.configured || !rawText.trim()) return null;

  return provider.completeJson<ParsedProjectText>({
    system: SYSTEM_PROMPT,
    user: rawText.slice(0, 8000),
    maxOutputTokens: 1200,
  });
}
