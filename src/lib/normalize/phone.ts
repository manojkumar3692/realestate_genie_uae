/**
 * UAE-aware phone normalization. Real CRM exports are messy — spaces, dashes,
 * parens, leading "00", missing country code, etc. This produces a stable
 * E.164-ish key used for exact-duplicate matching, while always preserving
 * the original raw value elsewhere (this module never mutates the source).
 */

export interface NormalizedPhone {
  /** E.164-style normalized value, e.g. "+971501234567". Empty string if unparseable. */
  normalized: string;
  /** True if this looks like a valid UAE mobile number. */
  isUaeMobile: boolean;
  /** True if we could produce *some* normalized value (may be a non-UAE number). */
  valid: boolean;
}

const UAE_MOBILE_PREFIXES = ["50", "51", "52", "54", "55", "56", "58"];

export function normalizeUaePhone(raw: string | null | undefined): NormalizedPhone {
  if (!raw) return { normalized: "", isUaeMobile: false, valid: false };

  // Strip everything except digits and a leading +.
  let cleaned = raw.trim();
  const hadPlus = cleaned.startsWith("+");
  cleaned = cleaned.replace(/[^\d]/g, "");

  if (!cleaned) return { normalized: "", isUaeMobile: false, valid: false };

  // Normalize "00" international prefix to nothing (we'll re-add +).
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);

  // Case: already has UAE country code 971.
  if (cleaned.startsWith("971")) {
    const rest = cleaned.slice(3).replace(/^0+/, "");
    if (isUaeMobileLocal(rest)) {
      return { normalized: `+971${rest}`, isUaeMobile: true, valid: true };
    }
    // Non-mobile UAE number (landline) — still normalize with country code.
    if (rest.length >= 7) {
      return { normalized: `+971${rest}`, isUaeMobile: false, valid: true };
    }
  }

  // Case: local format starting with 0, e.g. 0501234567.
  if (cleaned.startsWith("0") && isUaeMobileLocal(cleaned.slice(1))) {
    return { normalized: `+971${cleaned.slice(1)}`, isUaeMobile: true, valid: true };
  }

  // Case: no leading 0, just the 9-digit mobile number, e.g. 501234567.
  if (isUaeMobileLocal(cleaned)) {
    return { normalized: `+971${cleaned}`, isUaeMobile: true, valid: true };
  }

  // Not a recognizable UAE number. If it had a "+" or looks like a full
  // international number (10+ digits), keep it normalized generically so it
  // can still be used for exact-match dedupe, just not flagged as UAE mobile.
  if (hadPlus || cleaned.length >= 10) {
    return { normalized: `+${cleaned}`, isUaeMobile: false, valid: true };
  }

  // Too short / unrecognizable — not usable for matching.
  return { normalized: "", isUaeMobile: false, valid: false };
}

function isUaeMobileLocal(digits: string): boolean {
  if (digits.length !== 9) return false;
  return UAE_MOBILE_PREFIXES.includes(digits.slice(0, 2));
}

/** Compares the last N digits of two normalized phones — used as one signal in fuzzy dedupe. */
export function phoneFragmentsMatch(a: string, b: string, tailLength = 7): boolean {
  const da = a.replace(/\D/g, "");
  const db = b.replace(/\D/g, "");
  if (da.length < tailLength || db.length < tailLength) return false;
  return da.slice(-tailLength) === db.slice(-tailLength);
}
