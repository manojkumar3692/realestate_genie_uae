/**
 * UAE community/location alias dictionary + a soft "similarity" graph used by
 * the matching engine to award partial credit for nearby/comparable
 * communities (JVC ~ Arjan, Sobha Hartland ~ Dubai Hills, etc.) without
 * treating them as literally the same place.
 */

interface LocationEntry {
  canonical: string;
  aliases: string[];
  /** Loosely comparable communities — same investor profile / price band / vibe. */
  similarTo: string[];
  city: string;
}

export const LOCATION_DICTIONARY: LocationEntry[] = [
  {
    canonical: "Jumeirah Village Circle",
    aliases: ["jvc", "jumeirah village circle", "j.v.c", "jum village circle"],
    similarTo: ["Arjan", "Dubai Sports City", "Jumeirah Village Triangle"],
    city: "Dubai",
  },
  {
    canonical: "Jumeirah Village Triangle",
    aliases: ["jvt", "jumeirah village triangle"],
    similarTo: ["Jumeirah Village Circle", "Al Furjan"],
    city: "Dubai",
  },
  {
    canonical: "Arjan",
    aliases: ["arjan", "arjan dubailand"],
    similarTo: ["Jumeirah Village Circle", "Dubai Sports City", "Dubai South"],
    city: "Dubai",
  },
  {
    canonical: "Dubai South",
    aliases: ["dubai south", "dwc", "dubai world central", "dubai south residential"],
    similarTo: ["Arjan", "Dubailand", "Al Maktoum Airport Area"],
    city: "Dubai",
  },
  {
    canonical: "Business Bay",
    aliases: ["business bay", "bb", "b.bay"],
    similarTo: ["Downtown Dubai", "Al Habtoor City", "DIFC"],
    city: "Dubai",
  },
  {
    canonical: "Downtown Dubai",
    aliases: ["downtown dubai", "downtown", "burj area", "burj khalifa district"],
    similarTo: ["Business Bay", "DIFC", "City Walk"],
    city: "Dubai",
  },
  {
    canonical: "Dubai Hills Estate",
    aliases: ["dubai hills", "dubai hills estate", "dhe"],
    similarTo: ["Sobha Hartland", "Tilal Al Ghaf", "Arabian Ranches 3"],
    city: "Dubai",
  },
  {
    canonical: "Sobha Hartland",
    aliases: ["sobha hartland", "hartland", "sobha hartland 2"],
    similarTo: ["Dubai Hills Estate", "Meydan", "Downtown Dubai"],
    city: "Dubai",
  },
  {
    canonical: "Dubai Marina",
    aliases: ["dubai marina", "marina", "the marina"],
    similarTo: ["JBR", "Bluewaters Island", "Jumeirah Lake Towers"],
    city: "Dubai",
  },
  {
    canonical: "Jumeirah Lake Towers",
    aliases: ["jlt", "jumeirah lake towers", "jumeirah lakes towers"],
    similarTo: ["Dubai Marina", "Jumeirah Village Circle"],
    city: "Dubai",
  },
  {
    canonical: "Palm Jumeirah",
    aliases: ["palm jumeirah", "the palm", "palm"],
    similarTo: ["Bluewaters Island", "Dubai Marina"],
    city: "Dubai",
  },
  {
    canonical: "Al Furjan",
    aliases: ["al furjan", "furjan"],
    similarTo: ["Jumeirah Village Triangle", "Discovery Gardens"],
    city: "Dubai",
  },
  {
    canonical: "Dubailand",
    aliases: ["dubailand", "dubai land"],
    similarTo: ["Arjan", "Dubai South", "Al Furjan"],
    city: "Dubai",
  },
  {
    canonical: "Meydan",
    aliases: ["meydan", "meydan city", "mohammed bin rashid city", "mbr city"],
    similarTo: ["Sobha Hartland", "Dubai Hills Estate"],
    city: "Dubai",
  },
  {
    canonical: "Tilal Al Ghaf",
    aliases: ["tilal al ghaf", "tag"],
    similarTo: ["Dubai Hills Estate", "Arabian Ranches 3"],
    city: "Dubai",
  },
  {
    canonical: "Arabian Ranches",
    aliases: ["arabian ranches", "ar1", "arabian ranches 1"],
    similarTo: ["Arabian Ranches 3", "Tilal Al Ghaf", "Dubai Hills Estate"],
    city: "Dubai",
  },
  {
    canonical: "Arabian Ranches 3",
    aliases: ["arabian ranches 3", "ar3"],
    similarTo: ["Arabian Ranches", "Tilal Al Ghaf"],
    city: "Dubai",
  },
  {
    canonical: "Yas Island",
    aliases: ["yas island", "yas"],
    similarTo: ["Saadiyat Island", "Al Reem Island"],
    city: "Abu Dhabi",
  },
  {
    canonical: "Al Reem Island",
    aliases: ["al reem island", "reem island", "reem"],
    similarTo: ["Yas Island", "Saadiyat Island"],
    city: "Abu Dhabi",
  },
  {
    canonical: "Saadiyat Island",
    aliases: ["saadiyat island", "saadiyat"],
    similarTo: ["Yas Island", "Al Reem Island"],
    city: "Abu Dhabi",
  },
];

const ALIAS_LOOKUP = new Map<string, LocationEntry>();
for (const entry of LOCATION_DICTIONARY) {
  for (const alias of entry.aliases) {
    ALIAS_LOOKUP.set(normalizeKey(alias), entry);
  }
  ALIAS_LOOKUP.set(normalizeKey(entry.canonical), entry);
}

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export interface NormalizedLocation {
  original: string;
  canonical: string;
  city: string | null;
  matched: boolean;
}

/** Looks up a raw location string against the dictionary. Falls back to a trimmed original if unknown. */
export function normalizeLocation(raw: string | null | undefined): NormalizedLocation {
  if (!raw || !raw.trim()) return { original: "", canonical: "", city: null, matched: false };
  const key = normalizeKey(raw);
  const entry = ALIAS_LOOKUP.get(key);
  if (entry) return { original: raw.trim(), canonical: entry.canonical, city: entry.city, matched: true };

  // Try a loose "contains" match for things like "JVC - Dubai" or "Arjan, Dubailand".
  for (const [aliasKey, e] of ALIAS_LOOKUP) {
    if (aliasKey.length > 3 && key.includes(aliasKey)) {
      return { original: raw.trim(), canonical: e.canonical, city: e.city, matched: true };
    }
  }

  return { original: raw.trim(), canonical: raw.trim(), city: null, matched: false };
}

/** Communities considered a soft/comparable match for the given canonical location. */
export function getSimilarLocations(canonical: string): string[] {
  const entry = LOCATION_DICTIONARY.find((e) => e.canonical === canonical);
  return entry?.similarTo ?? [];
}

export function areLocationsSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return getSimilarLocations(a).includes(b) || getSimilarLocations(b).includes(a);
}
