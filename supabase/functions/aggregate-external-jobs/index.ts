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

const SOURCES = [
  { id: 'linkedin',       query: 'entry-level jobs Ghana site:linkedin.com/jobs' },
  { id: 'indeed',         query: 'graduate jobs Accra Ghana site:indeed.com' },
  { id: 'jobberman',      query: 'graduate internship site:jobberman.com.gh' },
  { id: 'ghanajobweb',    query: 'jobs site:ghanajobweb.com' },
  { id: 'brightermonday', query: 'graduate jobs site:brightermonday.co.ke' },
  { id: 'jobsinghana',    query: 'jobs site:jobsinghana.com' },
];

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

async function searchSource(apiKey: string, source: typeof SOURCES[number]): Promise<ScrapedJob[]> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: source.query,
        limit: 10,
        scrapeOptions: {
          formats: [
            { type: 'json', schema: JOB_SCHEMA, prompt: 'Extract all job postings on this page with company, location, type, required skills, and application deadline.' },
          ],
        },
      }),
    });
    if (!res.ok) {
      console.error(`[${source.id}] search failed`, res.status, await res.text());
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
          external_id: `${source.id}:${j.source_url || r.url}`,
          employment_type: (j.employment_type || 'full-time').toLowerCase(),
        });
      }
    }
    return jobs;
  } catch (e) {
    console.error(`[${source.id}]`, e);
    return [];
  }
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

    // Parallel search all sources
    const all = (await Promise.all(SOURCES.map(s => searchSource(FIRECRAWL_API_KEY, s)))).flat();
    console.log(`Aggregated ${all.length} jobs from ${SOURCES.length} sources`);

    let inserted = 0;
    let skipped = 0;
    for (const j of all) {
      // Dedupe by external_id
      const { data: existing } = await supabase
        .from('job_postings')
        .select('id')
        .eq('external_id', j.external_id)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const { error } = await supabase.from('job_postings').insert({
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
      });
      if (!error) inserted++;
      else console.error('insert error', error);
    }

    return new Response(JSON.stringify({
      success: true,
      sources: SOURCES.map(s => s.id),
      total_scraped: all.length,
      inserted,
      skipped,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
