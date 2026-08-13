import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

interface ScrapedJob {
  title: string;
  company_name?: string;
  company_domain?: string;
  location: string;
  employment_type: string;
  description: string;
  skills?: string[];
  source: string;
  source_url: string;
  external_id: string;
  application_deadline?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  experience_level?: string;
}

// Job board domains to search across for each major
const SITES: { id: string; site: string }[] = [
  { id: "linkedin", site: "linkedin.com/jobs" },
  { id: "indeed", site: "indeed.com" },
  { id: "jobberman", site: "jobberman.com.gh" },
  { id: "ghanajobweb", site: "ghanajobweb.com" },
  { id: "brightermonday", site: "brightermonday.co.ke" },
  { id: "jobsinghana", site: "jobsinghana.com" },
];

// Shared daily discovery taxonomy. This is intentionally fixed and independent
// of student records: ingestion creates one broad opportunity pool for everyone,
// while the product ranks and filters that shared pool per user at read time.
//
// Each segment has two complementary queries. Keep this list curated and bounded
// so discovery cost stays stable as the user base grows.
interface DiscoverySegment {
  id: string;
  label: string;
  queries: [string, string];
}

const SHARED_DISCOVERY_SEGMENTS: DiscoverySegment[] = [
  {
    id: "software-data",
    label: "software, data and AI",
    queries: [
      "software engineer developer data analyst entry-level graduate jobs Ghana",
      "frontend backend qa engineer data science internship jobs Ghana",
    ],
  },
  {
    id: "it-cybersecurity",
    label: "IT, cloud and cybersecurity",
    queries: [
      "IT support network engineer cybersecurity entry-level jobs Ghana",
      "cloud support systems administrator technical support internship jobs Ghana",
    ],
  },
  {
    id: "business-operations",
    label: "business and operations",
    queries: [
      "business analyst operations analyst project coordinator graduate jobs Ghana",
      "management trainee customer success sales associate internship jobs Ghana",
    ],
  },
  {
    id: "finance-accounting",
    label: "finance and accounting",
    queries: [
      "financial analyst audit associate accounts officer graduate jobs Ghana",
      "credit analyst tax associate finance internship entry-level jobs Ghana",
    ],
  },
  {
    id: "marketing-communications",
    label: "marketing and communications",
    queries: [
      "digital marketing marketing assistant content social media jobs Ghana",
      "communications officer public relations brand assistant internship jobs Ghana",
    ],
  },
  {
    id: "healthcare",
    label: "healthcare and life sciences",
    queries: [
      "registered nurse medical officer pharmacist entry-level jobs Ghana",
      "clinical research public health pharmacy internship healthcare jobs Ghana",
    ],
  },
  {
    id: "engineering-built-environment",
    label: "engineering and built environment",
    queries: [
      "graduate engineer electrical mechanical civil engineering jobs Ghana",
      "site engineer project engineer quality engineer engineering internship Ghana",
    ],
  },
  {
    id: "people-public-impact",
    label: "people, education and public impact",
    queries: [
      "human resources recruitment coordinator teaching assistant jobs Ghana",
      "research assistant programme officer policy analyst graduate jobs Ghana",
    ],
  },
];

const SEARCHES_PER_SEGMENT = 2;

interface DiscoveryPlan {
  segment: string;
  label: string;
  query: string;
}

function canonicalSourceUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith("utm_") || key === "ref" || key === "source")
        url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().toLowerCase().replace(/\/$/, "");
  }
}

function stableExternalId(source: string, sourceUrl: string): string {
  return `${source}:${canonicalSourceUrl(sourceUrl)}`;
}

function buildDiscoveryPlans(segment: DiscoverySegment): DiscoveryPlan[] {
  return segment.queries.map((query, index) => ({
    segment: segment.id,
    label: `${segment.label} query ${index + 1}`,
    query,
  }));
}

const JOB_SCHEMA = {
  type: "object",
  properties: {
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          company_name: { type: "string" },
          company_domain: {
            type: "string",
            description: "Just the bare domain, e.g. mtn.com.gh",
          },
          location: { type: "string" },
          employment_type: {
            type: "string",
            description:
              "one of: full-time, part-time, internship, contract, remote",
          },
          experience_level: {
            type: "string",
            description: "one of: entry, mid, senior",
          },
          description: { type: "string" },
          skills: { type: "array", items: { type: "string" } },
          source_url: { type: "string" },
          application_deadline: {
            type: "string",
            description: "ISO date YYYY-MM-DD if available",
          },
          salary_min: { type: "number" },
          salary_max: { type: "number" },
          salary_currency: { type: "string" },
        },
        required: ["title", "location", "source_url", "description"],
      },
    },
  },
};

// Cap concurrent outbound searches to avoid hammering Firecrawl / the network
// and to keep function memory bounded.
const MAX_CONCURRENT_SEARCHES = 3;

// Firecrawl enforces a per-minute request budget; a rate-limited search is a
// transient condition, not a failed source. Retry a bounded number of times.
const MAX_RATE_LIMIT_RETRIES = 3;

async function searchSource(
  apiKey: string,
  source: { id: string; site: string },
  plan: DiscoveryPlan,
): Promise<ScrapedJob[]> {
  try {
    const query = `${plan.query} site:${source.site}`;
    const body = JSON.stringify({
      query,
      // A page-sized yield makes the ingestion function useful beyond the
      // previous ~20-result feed while bounded query planning controls cost.
      limit: 25,
      scrapeOptions: {
        formats: [
          {
            type: "json",
            schema: JOB_SCHEMA,
            prompt: `Extract active early-career job postings for ${plan.label}: title, company, location, type, required skills, source URL, and application deadline. Exclude pages that are not individual vacancies.`,
          },
        ],
      },
    });

    let res: Response | null = null;
    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
      res = await fetch(`${FIRECRAWL_V2}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
      });
      if (res.status !== 429) break;
      await res.text();
      if (attempt === MAX_RATE_LIMIT_RETRIES) {
        console.error(`[${source.id}/${plan.label}] rate limited, giving up`);
        return [];
      }
      // Firecrawl resets its window each minute; back off past the reset.
      await new Promise((r) => setTimeout(r, 20000 * (attempt + 1)));
    }
    if (!res || !res.ok) {
      console.error(
        `[${source.id}/${plan.label}] search failed`,
        res?.status,
        res ? await res.text() : "no response",
      );
      return [];
    }
    const data = await res.json();
    // Firecrawl v2 may return `data` as an array or as `{ web: [...] }`.
    const raw = Array.isArray(data?.data)
      ? data.data
      : (data?.data?.web ?? data?.web ?? []);
    const results: unknown[] = Array.isArray(raw) ? raw : [];
    const jobs: ScrapedJob[] = [];
    for (const item of results) {
      const r = item as {
        url?: string;
        json?: { jobs?: ScrapedJob[] };
        extract?: { jobs?: ScrapedJob[] };
      };
      const extracted = r.json?.jobs || r.extract?.jobs || [];
      if (!Array.isArray(extracted)) continue;
      for (const j of extracted) {
        if (!j.title || !j.source_url) continue;
        jobs.push({
          ...j,
          source: source.id,
          source_url: j.source_url || r.url || "",
          external_id: stableExternalId(source.id, j.source_url || r.url || ""),
          employment_type: (j.employment_type || "full-time").toLowerCase(),
          // Skills come only from the source extraction. Discovery-segment
          // labels are coverage metadata, not evidence that an applicant needs
          // or has a particular skill.
          skills: j.skills || [],
        });
      }
    }
    return jobs;
  } catch (e) {
    console.error(`[${source.id}/${plan.label}]`, e);
    return [];
  }
}

/**
 * Run async tasks with bounded concurrency.
 */
async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async (_, runnerIdx) => {
      while (true) {
        const i = next++;
        if (i >= items.length) break;
        // Spacing out start times slightly to reduce thundering-herd.
        if (runnerIdx > 0)
          await new Promise((r) => setTimeout(r, runnerIdx * 50));
        results[i] = await worker(items[i]);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

// A full sweep of every segment exceeds both the Firecrawl per-minute budget
// and the request timeout, so each daily run covers a rotating slice of the
// shared taxonomy. Every segment is still refreshed within a few days.
const SEGMENTS_PER_RUN = 2;

function segmentsForRun(now: Date): DiscoverySegment[] {
  const total = SHARED_DISCOVERY_SEGMENTS.length;
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  const start = (dayIndex * SEGMENTS_PER_RUN) % total;
  return Array.from(
    { length: Math.min(SEGMENTS_PER_RUN, total) },
    (_, i) => SHARED_DISCOVERY_SEGMENTS[(start + i) % total],
  );
}

async function runAggregation(apiKey: string): Promise<void> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Daily discovery is deliberately independent of individual users. A fixed
  // broad taxonomy produces one shared pool; the Opportunities page applies
  // each user's major, skills, interests, and filters only after loading it.
  const segments = segmentsForRun(new Date());

  const pairs: { plan: DiscoveryPlan; site: (typeof SITES)[number] }[] = [];
  for (const segment of segments) {
    for (const plan of buildDiscoveryPlans(segment).slice(
      0,
      SEARCHES_PER_SEGMENT,
    )) {
      for (const site of SITES) pairs.push({ plan, site });
    }
  }

  const results = await pool(pairs, MAX_CONCURRENT_SEARCHES, ({ plan, site }) =>
    searchSource(apiKey, site, plan),
  );
  const all = results.flat();

  // Deduplicate within this run by external_id so upsert inputs are unique.
  const byExternalId = new Map<string, ScrapedJob>();
  for (const j of all) byExternalId.set(j.external_id, j);
  const deduped = Array.from(byExternalId.values());

  console.log(
    `Aggregated ${all.length} jobs (${deduped.length} unique) across segments [${segments.map((s) => s.id).join(", ")}] × ${SEARCHES_PER_SEGMENT} query families × ${SITES.length} sites (queries=${pairs.length}, concurrency=${MAX_CONCURRENT_SEARCHES})`,
  );

  if (deduped.length === 0) return;

  const { count: beforeCount, error: countErr } = await supabase
    .from("job_postings")
    .select("*", { count: "exact", head: true })
    .not("external_id", "is", null);
  if (countErr) console.error("count before upsert failed", countErr);

  // Scraped values are untrusted: the database enforces an employment-type
  // vocabulary and integer salaries, so normalise before writing.
  const EMPLOYMENT_TYPES = [
    "full-time",
    "part-time",
    "contract",
    "internship",
    "remote",
  ];
  const normaliseEmploymentType = (value: string | undefined): string => {
    const v = (value || "").toLowerCase().trim().replace(/\s+/g, "-");
    return EMPLOYMENT_TYPES.includes(v) ? v : "full-time";
  };
  const toInt = (value: unknown): number | null => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };

  const rows = deduped.map((j) => ({
    title: j.title,
    company_name: j.company_name || null,
    company_domain: j.company_domain || null,
    department: j.company_name || null,
    location: j.location,
    employment_type: normaliseEmploymentType(j.employment_type),
    experience_level: j.experience_level || null,
    description: j.description,
    skills: j.skills || [],
    salary_min: toInt(j.salary_min),
    salary_max: toInt(j.salary_max),
    salary_currency: j.salary_currency || null,
    application_deadline: j.application_deadline || null,
    source: j.source,
    source_url: j.source_url,
    external_id: j.external_id,
    is_external: true,
    status: "active",
  }));

  // Upsert in chunks of 200 to stay safely below PostgREST payload limits.
  const CHUNK = 200;
  let upsertErrors = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("job_postings")
      .upsert(chunk, { onConflict: "external_id", ignoreDuplicates: false });
    if (error) {
      upsertErrors += chunk.length;
      console.error("upsert chunk failed", i, error);
    }
  }

  const { count: afterCount } = await supabase
    .from("job_postings")
    .select("*", { count: "exact", head: true })
    .not("external_id", "is", null);

  const inserted = Math.max(0, (afterCount ?? 0) - (beforeCount ?? 0));
  const updated = Math.max(0, deduped.length - inserted - upsertErrors);
  console.log(
    `Upsert complete: scraped=${deduped.length} inserted=${inserted} updated=${updated} errors=${upsertErrors}`,
  );
}

Deno.serve((req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  // Service-role only (cron job)
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let isServiceRole = false;
  try {
    isServiceRole =
      JSON.parse(atob(token.split(".")[1] || ""))?.role === "service_role";
  } catch {}
  if (!isServiceRole) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    console.error("FIRECRAWL_API_KEY not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Aggregation not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const segments = segmentsForRun(new Date()).map((s) => s.id);

  // Scraping outlives the 150s request timeout, so it runs as a background
  // task and the cron caller gets an immediate acknowledgement.
  const work = runAggregation(FIRECRAWL_API_KEY).catch((e) =>
    console.error("aggregation failed", e),
  );
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(work);

  return new Response(
    JSON.stringify({
      success: true,
      accepted: true,
      shared_pool: true,
      sources: SITES.map((s) => s.id),
      segments,
      query_count: segments.length * SEARCHES_PER_SEGMENT * SITES.length,
    }),
    {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
