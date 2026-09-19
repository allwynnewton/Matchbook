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

export function ageFromDob(value: string) {
  const cleaned = value.replace(/(st|nd|rd|th)/gi, "");
  const dob = new Date(cleaned);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age--;
  return age;
}
