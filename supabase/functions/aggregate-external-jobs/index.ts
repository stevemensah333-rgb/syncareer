import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2';

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
  { id: 'linkedin',       site: 'linkedin.com/jobs' },
  { id: 'indeed',         site: 'indeed.com' },
  { id: 'jobberman',      site: 'jobberman.com.gh' },
  { id: 'ghanajobweb',    site: 'ghanajobweb.com' },
  { id: 'brightermonday', site: 'brightermonday.co.ke' },
  { id: 'jobsinghana',    site: 'jobsinghana.com' },
];

// Fallback majors used when no student rows exist yet
const FALLBACK_MAJORS = [
  'Computer Science', 'Business Administration', 'Accounting', 'Marketing',
  'Engineering', 'Nursing', 'Economics', 'Information Technology',
];

// Kept intentionally bounded: a daily run should cover distinct student demand
// without letting an unbounded major list multiply provider cost and latency.
const MAX_DISCOVERY_MAJORS = 12;
const SEARCHES_PER_MAJOR = 2;

// Search-engine terms complement a literal-major query. They improve discovery
// breadth but are not user-facing claims about a student's eligibility.
const ROLE_FAMILY_TERMS: Record<string, string[]> = {
  'computer science': ['software engineer', 'data analyst', 'qa engineer'],
  'data science': ['data analyst', 'data scientist', 'data engineer'],
  'information technology': ['it support', 'network engineer', 'cybersecurity analyst'],
  'business administration': ['business analyst', 'operations analyst', 'graduate trainee'],
  accounting: ['audit associate', 'accounts officer', 'finance analyst'],
  finance: ['financial analyst', 'credit analyst', 'audit associate'],
  marketing: ['digital marketing', 'marketing assistant', 'brand assistant'],
  nursing: ['registered nurse', 'graduate nurse', 'clinical nurse'],
  engineering: ['engineering intern', 'graduate engineer', 'project engineer'],
  economics: ['economic analyst', 'research analyst', 'policy analyst'],
};

interface DiscoveryPlan {
  major: string;
  label: string;
  query: string;
}

function canonicalSourceUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') url.searchParams.delete(key);
    }
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().toLowerCase().replace(/\/$/, '');
  }
}

function stableExternalId(source: string, sourceUrl: string): string {
  return `${source}:${canonicalSourceUrl(sourceUrl)}`;
}

function buildDiscoveryPlans(major: string): DiscoveryPlan[] {
  const normalized = major.trim().toLowerCase();
  const roleTerms = ROLE_FAMILY_TERMS[normalized] ?? [`${major} graduate`, `${major} intern`, `${major} entry level`];
  return [
    {
      major,
      label: `${major} graduate roles`,
      query: `${major} entry-level graduate jobs Ghana`,
    },
    {
      major,
      label: `${major} role family`,
      query: `(${roleTerms.slice(0, 3).map((term) => `"${term}"`).join(' OR ')}) entry-level jobs Ghana`,
    },
  ];
}

const JOB_SCHEMA = {
  type: 'object',
  properties: {
    jobs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          company_name: { type: 'string' },
          company_domain: { type: 'string', description: 'Just the bare domain, e.g. mtn.com.gh' },
          location: { type: 'string' },
          employment_type: { type: 'string', description: 'one of: full-time, part-time, internship, contract, remote' },
          experience_level: { type: 'string', description: 'one of: entry, mid, senior' },
          description: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } },
          source_url: { type: 'string' },
          application_deadline: { type: 'string', description: 'ISO date YYYY-MM-DD if available' },
          salary_min: { type: 'number' },
          salary_max: { type: 'number' },
          salary_currency: { type: 'string' },
        },
        required: ['title', 'location', 'source_url', 'description'],
      },
    },
  },
};

// Cap concurrent outbound searches to avoid hammering Firecrawl / the network
// and to keep function memory bounded.
const MAX_CONCURRENT_SEARCHES = 6;

async function searchSource(apiKey: string, source: { id: string; site: string }, plan: DiscoveryPlan): Promise<ScrapedJob[]> {
  try {
    const query = `${plan.query} site:${source.site}`;
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        // A page-sized yield makes the ingestion function useful beyond the
        // previous ~20-result feed while bounded query planning controls cost.
        limit: 25,
        scrapeOptions: {
          formats: [
            { type: 'json', schema: JOB_SCHEMA, prompt: `Extract active early-career job postings for ${plan.label}: title, company, location, type, required skills, source URL, and application deadline. Exclude pages that are not individual vacancies.` },
          ],
        },
      }),
    });
    if (!res.ok) {
      console.error(`[${source.id}/${plan.label}] search failed`, res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const results = data.data || data.web || [];
    const jobs: ScrapedJob[] = [];
    for (const r of results) {
      const extracted = r.json?.jobs || r.extract?.jobs || [];
      for (const j of extracted) {
        if (!j.title || !j.source_url) continue;
        jobs.push({
          ...j,
          source: source.id,
          source_url: j.source_url || r.url,
          external_id: stableExternalId(source.id, j.source_url || r.url),
          employment_type: (j.employment_type || 'full-time').toLowerCase(),
          skills: [...(j.skills || []), plan.major],
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
  const runners = Array.from({ length: Math.min(limit, items.length) }, async (_, runnerIdx) => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      // Spacing out start times slightly to reduce thundering-herd.
      if (runnerIdx > 0) await new Promise((r) => setTimeout(r, runnerIdx * 50));
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Service-role only (cron job)
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  let isServiceRole = false;
  try { isServiceRole = JSON.parse(atob(token.split('.')[1] || ''))?.role === 'service_role'; } catch {}
  if (!isServiceRole) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch distinct majors from student_details; fall back to a general set
    const { data: majorRows } = await supabase
      .from('student_details')
      .select('major')
      .not('major', 'is', null);
    const majorsSet = new Set<string>();
    (majorRows || []).forEach((r: any) => { if (r.major) majorsSet.add(String(r.major).trim()); });
    const candidateMajors = majorsSet.size > 0 ? Array.from(majorsSet) : FALLBACK_MAJORS;
    const majors = candidateMajors
      .sort((left, right) => left.localeCompare(right))
      .slice(0, MAX_DISCOVERY_MAJORS);

    // Two complementary queries per major (literal discipline + role family)
    // across every supported source. This is bounded by design and avoids a
    // single narrow phrase deciding the entire daily opportunity pool.
    const pairs: { plan: DiscoveryPlan; site: typeof SITES[number] }[] = [];
    for (const major of majors) {
      for (const plan of buildDiscoveryPlans(major).slice(0, SEARCHES_PER_MAJOR)) {
        for (const site of SITES) pairs.push({ plan, site });
      }
    }

    const results = await pool(pairs, MAX_CONCURRENT_SEARCHES, ({ plan, site }) =>
      searchSource(FIRECRAWL_API_KEY, site, plan),
    );
    const all = results.flat();

    // Deduplicate within this run by external_id so upsert inputs are unique.
    const byExternalId = new Map<string, ScrapedJob>();
    for (const j of all) byExternalId.set(j.external_id, j);
    const deduped = Array.from(byExternalId.values());

    console.log(`Aggregated ${all.length} jobs (${deduped.length} unique) across ${majors.length} majors × ${SEARCHES_PER_MAJOR} query families × ${SITES.length} sites (queries=${pairs.length}, concurrency=${MAX_CONCURRENT_SEARCHES})`);

    if (deduped.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        sources: SITES.map(s => s.id),
        majors,
        query_count: pairs.length,
        total_scraped: 0,
        inserted: 0,
        updated: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Bulk upsert: a single statement that uses the unique partial index on
    // external_id. Existing rows keep their id/created_at; new rows are
    // inserted. We count inserted vs. no-op via a deterministic client-side
    // comparison of upserted count vs. previous count — simpler is to record
    // the before-count once.
    const { count: beforeCount, error: countErr } = await supabase
      .from('job_postings')
      .select('*', { count: 'exact', head: true })
      .not('external_id', 'is', null);
    if (countErr) console.error('count before upsert failed', countErr);

    const rows = deduped.map((j) => ({
      title: j.title,
      company_name: j.company_name || null,
      company_domain: j.company_domain || null,
      department: j.company_name || null,
      location: j.location,
      employment_type: j.employment_type,
      experience_level: j.experience_level || null,
      description: j.description,
      skills: j.skills || [],
      salary_min: j.salary_min || null,
      salary_max: j.salary_max || null,
      salary_currency: j.salary_currency || null,
      application_deadline: j.application_deadline || null,
      source: j.source,
      source_url: j.source_url,
      external_id: j.external_id,
      is_external: true,
      status: 'active',
    }));

    // Upsert in chunks of 200 to stay safely below PostgREST payload limits.
    const CHUNK = 200;
    let upsertErrors = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from('job_postings')
        .upsert(chunk, { onConflict: 'external_id', ignoreDuplicates: false });
      if (error) {
        upsertErrors += chunk.length;
        console.error('upsert chunk failed', i, error);
      }
    }

    const { count: afterCount } = await supabase
      .from('job_postings')
      .select('*', { count: 'exact', head: true })
      .not('external_id', 'is', null);

    const inserted = Math.max(0, (afterCount ?? 0) - (beforeCount ?? 0));
    const updated = deduped.length - inserted - upsertErrors;

    return new Response(JSON.stringify({
      success: true,
      sources: SITES.map(s => s.id),
      majors,
      query_count: pairs.length,
      total_scraped: deduped.length,
      inserted,
      updated: Math.max(0, updated),
      errors: upsertErrors,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
