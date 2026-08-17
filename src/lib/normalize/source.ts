/** Normalizes messy lead-source text ("FB", "Meta Lead Ads", "Instagram") into a canonical platform bucket. */

export type SourcePlatform =
  | "meta"
  | "google"
  | "portal"
  | "referral"
  | "website"
  | "walk_in"
  | "other"
  | "unknown";

interface SourceRule {
  platform: SourcePlatform;
  displayName: string;
  patterns: RegExp[];
}

const SOURCE_RULES: SourceRule[] = [
  {
    platform: "meta",
    displayName: "Meta",
    patterns: [/\bfacebook\b/i, /\bfb\b/i, /\bmeta\b/i, /\binstagram\b/i, /\big\b/i, /\bwhatsapp ads?\b/i],
  },
  {
    platform: "google",
    displayName: "Google",
    patterns: [/\bgoogle\b/i, /\badwords\b/i, /\bgoogle ?ads\b/i, /\bsem\b/i],
  },
  {
    platform: "portal",
    displayName: "Property Portal",
    patterns: [/\bbayut\b/i, /\bproperty ?finder\b/i, /\bdubizzle\b/i, /\bportal\b/i],
  },
  {
    platform: "referral",
    displayName: "Referral",
    patterns: [/\breferral\b/i, /\breferred\b/i, /\bfriend\b/i, /\bword of mouth\b/i],
  },
  {
    platform: "website",
    displayName: "Website",
    patterns: [/\bwebsite\b/i, /\bweb ?form\b/i, /\blanding page\b/i, /\borganic\b/i],
  },
  {
    platform: "walk_in",
    displayName: "Walk-in",
    patterns: [/\bwalk ?in\b/i, /\bwalk-in\b/i, /\boffice visit\b/i],
  },
];

export interface NormalizedSource {
  original: string;
  displayName: string;
  platform: SourcePlatform;
}

export function normalizeSource(raw: string | null | undefined): NormalizedSource {
  if (!raw || !raw.trim()) {
    return { original: "", displayName: "Unknown", platform: "unknown" };
  }
  const text = raw.trim();
  for (const rule of SOURCE_RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return { original: text, displayName: rule.displayName, platform: rule.platform };
    }
  }
  return { original: text, displayName: text, platform: "other" };
}
