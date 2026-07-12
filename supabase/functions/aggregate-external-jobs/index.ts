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

async function searchSource(apiKey: string, source: { id: string; site: string }, major: string): Promise<ScrapedJob[]> {
  try {
    const query = `${major} entry-level graduate jobs Ghana site:${source.site}`;
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit: 15,
        scrapeOptions: {
          formats: [
            { type: 'json', schema: JOB_SCHEMA, prompt: `Extract job postings relevant to a ${major} graduate: title, company, location, type, required skills, and application deadline.` },
          ],
        },
      }),
    });
    if (!res.ok) {
      console.error(`[${source.id}/${major}] search failed`, res.status, await res.text());
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
          skills: [...(j.skills || []), major],
        });
      }
    }
    return jobs;
  } catch (e) {
    console.error(`[${source.id}/${major}]`, e);
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

    // Fetch distinct majors from student_details; fall back to a general set
    const { data: majorRows } = await supabase
      .from('student_details')
      .select('major')
      .not('major', 'is', null);
    const majorsSet = new Set<string>();
    (majorRows || []).forEach((r: any) => { if (r.major) majorsSet.add(String(r.major).trim()); });
    const majors = majorsSet.size > 0 ? Array.from(majorsSet) : FALLBACK_MAJORS;

    // Search each site for each major in parallel
    const tasks: Promise<ScrapedJob[]>[] = [];
    for (const major of majors) {
      for (const site of SITES) {
        tasks.push(searchSource(FIRECRAWL_API_KEY, site, major));
      }
    }
    const all = (await Promise.all(tasks)).flat();
    console.log(`Aggregated ${all.length} jobs across ${majors.length} majors × ${SITES.length} sites`);

    let inserted = 0;
    let skipped = 0;
    for (const j of all) {
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
      sources: SITES.map(s => s.id),
      majors,
      total_scraped: all.length,
      inserted,
      skipped,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
