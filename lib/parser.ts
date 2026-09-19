import { emptyProfile, Profile } from "./types";

const labels: Array<[keyof Profile, RegExp]> = [
  ["name", /^name$/i], ["dateOfBirth", /^(date of birth|dob)$/i], ["gender", /^gender(?:\s*\(.*\))?$/i],
  ["motherTongue", /^mother tongue$/i], ["languages", /^languages? known$/i],
  ["education", /^(educational qualification|education)$/i], ["job", /^(present job and place|job|occupation)$/i],
  ["height", /^height$/i], ["weight", /^weight$/i], ["religion", /^religion$/i],
  ["originallyFrom", /^(originally from|native place)$/i], ["residence", /^(present residence|residence)$/i],
  ["familyDetails", /^family details(?:\s*\(.*\))?$/i], ["hobbies", /^hobbies$/i],
  ["phone", /^(whatsapp no(?:\/cell no)?|cell no|mobile(?: number)?|contact)$/i],
  ["maritalStatus", /^marital status(?:\s*\(.*\))?$/i], ["partnerPreference", /^partner preference(?:\s*\(.*\))?$/i]
];

// WhatsApp formatting markers (*bold*, _italic_, ~strike~, ```mono```) that wrap
// text and would otherwise break label detection, e.g. "*1) Name:* Aston".
const stripFormatting = (value: string) => value.replace(/[*~`]/g, "").trim();

export function parseProfileText(raw: string): Profile {
  const profile = emptyProfile();
  profile.rawText = raw.trim();
  let current: keyof Profile | null = null;
  for (const sourceLine of raw.split(/\r?\n/)) {
    const line = stripFormatting(sourceLine);
    if (!line) continue;
    const cleaned = line.replace(/^\d+\s*[.)-]\s*/, "");
    const separator = cleaned.indexOf(":");
    if (separator >= 0) {
      const label = cleaned.slice(0, separator).trim();
      const found = labels.find(([, pattern]) => pattern.test(label));
      if (found) {
        current = found[0];
        profile[current] = cleaned.slice(separator + 1).trim() as never;
        continue;
      }
    }
    if (current && typeof profile[current] === "string") {
      profile[current] = `${profile[current]} ${cleaned}`.trim() as never;
    }
  }
  return profile;
}

// True when at least one known label (Name, DOB, etc.) was recognized and filled.
export function hasRecognizedFields(profile: Profile): boolean {
  return labels.some(([key]) => String(profile[key] || "").trim().length > 0);
}

// Parses a date of birth. Indian DD-MM-YYYY is the primary format (also accepts
// / and . separators and 2-digit years); ISO YYYY-MM-DD and textual dates like
// "11th July 2000" are handled as fallbacks.
export function parseDob(value: string): Date | null {
  const cleaned = value.replace(/(\d)(st|nd|rd|th)/gi, "$1").trim();
  const numeric = cleaned.match(/(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/);
  if (numeric) {
    const [, a, b, c] = numeric;
    let day: number, month: number, year: number;
    if (a.length === 4) { year = +a; month = +b; day = +c; } // YYYY-MM-DD (ISO)
    else { day = +a; month = +b; year = +c; }                // DD-MM-YYYY (Indian)
    if (year < 100) year += year < 30 ? 2000 : 1900;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    // Reject impossible dates (e.g. 31-02-2000 rolling over to March).
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d;
  }
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ageFromDob(value: string) {
  const dob = parseDob(value);
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age--;
  if (age < 0 || age > 120) return null;
  return age;
}
