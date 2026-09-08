// Pure helpers for reading a pasted job link. No runtime imports, so they can
// be unit-tested without the Deno/Supabase runtime.

const LIMITS = {
  url: 2_000,
  title: 200,
  organisation: 200,
  location: 200,
  employmentType: 60,
  description: 20_000,
  requirements: 8_000,
  skill: 60,
  skills: 20,
};

export interface ExtractedPosting {
  title: string | null;
  organisation: string | null;
  location: string | null;
  employmentType: string | null;
  deadline: string | null;
  description: string | null;
  requirements: string | null;
  skills: string[];
  sourceUrl: string;
  sourceHost: string;
}

const PRIVATE_HOST =
  /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

/** Accepts only a public http(s) URL. Blocks loopback/private hosts (SSRF). */
export function validatePostingUrl(raw: unknown): { ok: true; url: URL } | { ok: false; reason: string } {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, reason: "A job link is required." };
  const value = raw.trim();
  if (value.length > LIMITS.url) return { ok: false, reason: "That link is too long." };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "That does not look like a web address." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https links can be read." };
  }
  if (!url.hostname.includes(".") || PRIVATE_HOST.test(url.hostname)) {
    return { ok: false, reason: "That link does not point at a public job posting." };
  }
  return { ok: true, url };
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/** ISO date only when the model returned a real calendar date. */
function isoDate(value: unknown): string | null {
  const raw = text(value, 40);
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const parsed = new Date(`${match[0]}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : match[0];
}

function skillList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    const skill = text(entry, LIMITS.skill);
    if (skill && !out.some((existing) => existing.toLowerCase() === skill.toLowerCase())) out.push(skill);
    if (out.length >= LIMITS.skills) break;
  }
  return out;
}

/** Shapes a raw scrape response into the bounded posting contract. */
export function normalizePosting(payload: unknown, url: URL): ExtractedPosting {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const extracted = (data.json && typeof data.json === "object" ? data.json : {}) as Record<string, unknown>;
  const metadata = (data.metadata && typeof data.metadata === "object" ? data.metadata : {}) as Record<string, unknown>;
  const markdown = text(data.markdown, LIMITS.description);

  return {
    title: text(extracted.title, LIMITS.title) ?? text(metadata.title, LIMITS.title),
    organisation: text(extracted.organisation, LIMITS.organisation) ?? text(extracted.company, LIMITS.organisation),
    location: text(extracted.location, LIMITS.location),
    employmentType: text(extracted.employment_type, LIMITS.employmentType),
    deadline: isoDate(extracted.application_deadline),
    description: text(extracted.description, LIMITS.description) ?? markdown,
    requirements: text(extracted.requirements, LIMITS.requirements),
    skills: skillList(extracted.skills),
    sourceUrl: url.toString(),
    sourceHost: url.hostname.replace(/^www\./, ""),
  };
}

