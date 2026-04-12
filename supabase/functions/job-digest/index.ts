import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get users who want weekly digest
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, last_digest_sent_at')
      .eq('email_enabled', true)
      .eq('weekly_digest', true)

    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ message: 'No users opted in' }), { status: 200 })
    }

    let sentCount = 0

    for (const pref of prefs) {
      try {
        // Get user email
        const { data: { user } } = await supabase.auth.admin.getUserById(pref.user_id)
        if (!user?.email) continue

        // Get user's assessment interests
        const { data: assessment } = await supabase
          .from('assessments')
          .select('primary_interest, secondary_interest')
          .eq('user_id', pref.user_id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Get new jobs since last digest
        const since = pref.last_digest_sent_at || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: newJobs } = await supabase
          .from('job_postings')
          .select('id, title, location, employment_type')
          .eq('status', 'active')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!newJobs || newJobs.length === 0) continue

        // Build email
        const jobListHtml = newJobs.slice(0, 5).map(j => 
          `<tr><td style="padding:12px 16px;border-bottom:1px solid #eee"><strong>${j.title}</strong><br><span style="color:#666;font-size:13px">${j.location} · ${j.employment_type}</span></td></tr>`
        ).join('')

        const interests = [assessment?.primary_interest, assessment?.secondary_interest].filter(Boolean).join(', ')

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1a1a1a">🎯 ${newJobs.length} new job${newJobs.length > 1 ? 's' : ''} this week</h2>
            ${interests ? `<p style="color:#666">Based on your interests in <strong>${interests}</strong></p>` : ''}
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              ${jobListHtml}
            </table>
            <a href="https://syncareer.lovable.app/opportunities" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">View All Opportunities</a>
            <p style="color:#999;font-size:12px;margin-top:24px">You're receiving this because you opted in to weekly job digests. Manage your preferences in Settings.</p>
          </div>
        `

        // Send via Resend
        await fetch(`${GATEWAY_URL}/emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`,
            'X-Connection-Api-Key': resendApiKey,
          },
          body: JSON.stringify({
            from: 'Syncareer <onboarding@resend.dev>',
            to: [user.email],
            subject: `🎯 ${newJobs.length} new job${newJobs.length > 1 ? 's' : ''} matching your profile`,
            html,
          }),
        })

        // Update last_digest_sent_at
        await supabase
          .from('notification_preferences')
          .update({ last_digest_sent_at: new Date().toISOString() })
          .eq('user_id', pref.user_id)

        sentCount++
      } catch (err) {
        console.error(`Failed to send digest to ${pref.user_id}:`, err)
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), { status: 200 })
  } catch (error) {
    console.error('Job digest error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
