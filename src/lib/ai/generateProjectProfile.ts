import { getAiProvider } from "./provider";

export interface ProjectProfileInput {
  name: string;
  developer: string;
  location: string;
  propertyTypes: string[];
  bedroomTypes: string[];
  startingPrice: number | null;
  currency: string;
  paymentPlanSummary: string;
  constructionStatus: "off_plan" | "ready";
  expectedHandover: string | null;
  expectedRentalYieldPercent: number | null;
  targetBuyerType: "investor" | "end_user" | "both";
  amenities: string[];
}

export interface ProjectProfileResult {
  buyerFitSummary: string;
  aiSummary: string;
  strengths: string[];
  potentialSegments: string[];
}

const SYSTEM_PROMPT = `You are a real-estate analyst. Given structured facts about a project, produce a short buyer-fit profile used later to match historical leads against this project. Respond with strict JSON: {"buyerFitSummary": string (one line, e.g. "Investor-focused, off-plan, low entry price"), "aiSummary": string (2-3 sentences), "strengths": string[] (3-6 short phrases, e.g. "Low initial payment", "Near airport"), "potentialSegments": string[] (3-6 short buyer-segment phrases, e.g. "first-time investors", "buyers previously considering JVC/Arjan", "buyers sensitive to upfront payment")}`;

export async function generateProjectProfile(input: ProjectProfileInput): Promise<ProjectProfileResult> {
  const provider = getAiProvider();
  if (provider.configured) {
    const result = await provider.completeJson<ProjectProfileResult>({
      system: SYSTEM_PROMPT,
      user: JSON.stringify(input),
      maxOutputTokens: 800,
    });
    if (result) return result;
  }
  return templateProjectProfile(input);
}

/** Deterministic fallback so a project profile always exists, AI key or not. */
export function templateProjectProfile(input: ProjectProfileInput): ProjectProfileResult {
  const strengths: string[] = [];
  if (input.constructionStatus === "off_plan") strengths.push("Off-plan appreciation potential");
  if (input.expectedRentalYieldPercent && input.expectedRentalYieldPercent >= 6) {
    strengths.push(`Strong projected rental yield (${input.expectedRentalYieldPercent}%+)`);
  }
  if (input.paymentPlanSummary) strengths.push(`Payment plan: ${input.paymentPlanSummary}`);
  if (input.startingPrice) strengths.push(`Accessible entry price from ${input.currency} ${Math.round(input.startingPrice).toLocaleString()}`);
  strengths.push(...input.amenities.slice(0, 3));

  const segments: string[] = [];
  if (input.targetBuyerType !== "end_user") segments.push("Investors seeking capital appreciation");
  if (input.targetBuyerType !== "investor") segments.push("End-users looking for a home in " + (input.location || "the area"));
  if (input.bedroomTypes.some((b) => /studio|1/i.test(b))) segments.push("First-time / smaller-ticket investors");
  segments.push(`Buyers previously interested in nearby communities to ${input.location || "this project"}`);

  const buyerFitSummary =
    input.targetBuyerType === "investor"
      ? "Investor-focused"
      : input.targetBuyerType === "end_user"
      ? "End-user focused"
      : "Investor & end-user fit";

  return {
    buyerFitSummary,
    aiSummary: `${input.name} is a ${input.constructionStatus === "off_plan" ? "off-plan" : "ready"} ${input.propertyTypes.join("/") || "residential"} project by ${input.developer || "the developer"} in ${input.location || "Dubai"}${input.startingPrice ? `, starting from ${input.currency} ${Math.round(input.startingPrice).toLocaleString()}` : ""}.`,
    strengths: strengths.filter(Boolean),
    potentialSegments: segments.filter(Boolean),
  };
}
