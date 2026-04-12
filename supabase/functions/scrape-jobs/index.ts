const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_EMPLOYER_ID = '00000000-0000-0000-0000-000000000001';

const JOB_SOURCES = [
  {
    name: 'jobberman',
    url: 'https://www.jobberman.com.gh/jobs?keywords=entry+level&page=1',
    label: 'Jobberman Ghana',
  },
  {
    name: 'brightspire',
    url: 'https://brightspyre.com/jobs?country=ghana&level=entry',
    label: 'BrightSpire',
  },
];

interface ParsedJob {
  title: string;
  company: string;
  location: string;
  employment_type: string;
  description: string;
  requirements: string;
  skills: string[];
  source_url: string;
  external_id: string;
}

async function scrapeSource(source: typeof JOB_SOURCES[0], firecrawlKey: string): Promise<string> {
  console.log(`Scraping ${source.name}: ${source.url}`);
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: source.url,
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 3000,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error(`Firecrawl error for ${source.name}:`, data);
    return '';
  }

  return data?.data?.markdown || data?.markdown || '';
}

async function parseJobsWithAI(markdown: string, sourceName: string, lovableApiKey: string): Promise<ParsedJob[]> {
  if (!markdown || markdown.length < 100) {
    console.log(`Insufficient content from ${sourceName}, skipping AI parse`);
    return [];
  }

  // Truncate to avoid token limits
  const truncated = markdown.substring(0, 15000);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You extract job listings from scraped job board content. Return a JSON array of jobs. Each job object must have:
- title (string)
- company (string)
- location (string, default "Accra, Ghana")
- employment_type (one of: "full-time", "part-time", "internship", "remote")
- description (string, 1-3 sentences)
- requirements (string, brief)
- skills (string array, 3-8 relevant skills)
- source_url (string, the job URL if found, otherwise empty)
- external_id (string, a unique identifier like "jobberman-{slug}" or "brightspire-{slug}")

Focus on entry-level and graduate positions. If the content doesn't contain clear job listings, return an empty array [].
Return ONLY valid JSON array, no markdown fences.`
        },
        {
          role: 'user',
          content: `Extract job listings from this ${sourceName} content:\n\n${truncated}`
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`AI parse error for ${sourceName}:`, err);
    return [];
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '[]';
  
  try {
    const parsed = JSON.parse(content);
    // Handle both direct array and { jobs: [...] } format
    const jobs = Array.isArray(parsed) ? parsed : (parsed.jobs || []);
    console.log(`Parsed ${jobs.length} jobs from ${sourceName}`);
    return jobs;
  } catch (e) {
    console.error(`Failed to parse AI response for ${sourceName}:`, e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const source of JOB_SOURCES) {
      try {
        const markdown = await scrapeSource(source, firecrawlKey);
        const jobs = await parseJobsWithAI(markdown, source.name, lovableApiKey);

        for (const job of jobs) {
          if (!job.title || !job.external_id) continue;

          const { error } = await supabase
            .from('job_postings')
            .upsert({
              title: job.title,
              department: job.company || source.label,
              location: job.location || 'Accra, Ghana',
              employment_type: job.employment_type || 'full-time',
              description: job.description || '',
              requirements: job.requirements || null,
              skills: job.skills || [],
              status: 'active',
              employer_id: SYSTEM_EMPLOYER_ID,
              source: source.name,
              source_url: job.source_url || source.url,
              external_id: job.external_id,
              is_external: true,
            }, {
              onConflict: 'external_id',
              ignoreDuplicates: true,
            });

          if (error) {
            console.error(`Insert error for ${job.external_id}:`, error.message);
            totalSkipped++;
          } else {
            totalInserted++;
          }
        }
      } catch (sourceError) {
        console.error(`Error processing ${source.name}:`, sourceError);
      }
    }

    const result = { success: true, inserted: totalInserted, skipped: totalSkipped };
    console.log('Scrape complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scrape jobs error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
