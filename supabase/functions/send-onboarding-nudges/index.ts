import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Sends per-recipient onboarding reminder emails to users who haven't completed
// the next step in their journey. Triggered by pg_cron (daily) — but each email
// is a 1:1 transactional message keyed by user_id + template, so it's idempotent
// and never sends twice to the same user for the same step.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const results = { assessment_nudges: 0, cv_nudges: 0, errors: [] as string[] }

  // 1. Assessment nudge: students who signed up >= 3 days ago and have NO completed assessment.
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (error) throw error

    const threeDaysAgoMs = Date.now() - 3 * 24 * 60 * 60 * 1000
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000

    const candidates = (users.users || []).filter((u) => {
      if (!u.email) return false
      const created = new Date(u.created_at).getTime()
      return created <= threeDaysAgoMs
    })

    for (const u of candidates) {
      const userType = (u.user_metadata as any)?.user_type
      if (userType && userType !== 'student') continue

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', u.id)
        .maybeSingle()
      const name = profile?.full_name?.split(' ')[0] || (u.user_metadata as any)?.full_name?.split(' ')[0]

      const createdMs = new Date(u.created_at).getTime()

      // Assessment nudge (3+ days old, no completed assessment)
      const { data: assessment } = await supabase
        .from('assessments')
        .select('id')
        .eq('user_id', u.id)
        .not('completed_at', 'is', null)
        .limit(1)
        .maybeSingle()

      if (!assessment) {
        const r = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'assessment-nudge',
            recipientEmail: u.email,
            idempotencyKey: `assessment-nudge-${u.id}`,
            templateData: { name },
          },
        })
        if (r.error) results.errors.push(`assessment ${u.id}: ${r.error.message}`)
        else results.assessment_nudges++
        continue
      }

      // CV nudge (7+ days old, has assessment, no resume)
      if (createdMs > sevenDaysAgoMs) continue
      const { data: resume } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', u.id)
        .limit(1)
        .maybeSingle()
      if (resume) continue

      const r = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'cv-nudge',
          recipientEmail: u.email,
          idempotencyKey: `cv-nudge-${u.id}`,
          templateData: { name },
        },
      })
      if (r.error) results.errors.push(`cv ${u.id}: ${r.error.message}`)
      else results.cv_nudges++
    }
  } catch (e: any) {
    results.errors.push(`fatal: ${e.message}`)
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
