import { createClient } from 'npm:@supabase/supabase-js@2'

const jsonHeaders = { 'Content-Type': 'application/json' }

function renderData(template: string, raw: Record<string, unknown>): Record<string, unknown> {
  const mentor = String(raw.mentorName ?? 'Mentor')
  const mentee = String(raw.menteeName ?? 'Student')
  const requestId = typeof raw.requestId === 'string' ? raw.requestId : undefined
  const detail = [raw.goal, raw.context].filter((value) => typeof value === 'string' && value).join('\n\n')
  switch (template) {
    case 'mentor-request-new': return { heading: `New request for ${mentor}`, preview: `${mentee} sent a mentorship request`, intro: `${mentee} sent a focused mentorship request. Their contact details remain private until you accept.`, detail: String(raw.goal ?? ''), requestId, actionLabel: 'Review request' }
    case 'mentor-request-accepted-mentor': return { heading: `You can now contact ${mentee}`, intro: 'You accepted this request. Use the email below to arrange a suitable time and continue the conversation.', detail, contactLabel: 'Mentee email', contactEmail: raw.menteeEmail, requestId }
    case 'mentor-request-accepted-mentee': return { heading: `${mentor} accepted your request`, intro: 'Your introduction is ready. Use the email below to arrange a suitable time and continue the conversation.', detail, contactLabel: 'Mentor email', contactEmail: raw.mentorEmail, requestId }
    case 'mentor-request-declined': return { heading: 'Your mentorship request was declined', intro: `${mentor} cannot take this request right now. You can send a new request to another verified mentor.`, requestId, actionLabel: 'View requests' }
    case 'mentor-verification-approved': return { heading: 'Your mentor profile is verified', intro: `Your company email has been verified${raw.companyName ? ` for ${raw.companyName}` : ''}. Set your availability to accepting or limited when you are ready to appear in the directory.` }
    default: return { heading: 'Mentor verification update', intro: raw.reason ? `Your profile is not currently visible: ${raw.reason}` : 'Your mentor profile is not currently visible. Sign in to review its status.' }
  }
}

function serviceRoleRequest(req: Request): boolean {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''))
    return payload?.role === 'service_role'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (!serviceRoleRequest(req)) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: jsonHeaders })
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: jsonHeaders })
  const supabase = createClient(url, key)
  const { data: rows, error } = await supabase.from('mentorship_email_outbox').select('*').in('status', ['pending', 'failed']).lt('attempts', 5).order('created_at').limit(20)
  if (error) return new Response(JSON.stringify({ error: 'Outbox unavailable' }), { status: 500, headers: jsonHeaders })
  let queued = 0
  for (const row of rows ?? []) {
    const { data: claimed } = await supabase.from('mentorship_email_outbox').update({ status: 'processing', attempts: row.attempts + 1 }).eq('id', row.id).in('status', ['pending', 'failed']).select('id').maybeSingle()
    if (!claimed) continue
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(row.recipient_user_id)
    if (userError || !userData.user?.email) {
      await supabase.from('mentorship_email_outbox').update({ status: 'failed', last_error: 'Recipient account email unavailable' }).eq('id', row.id)
      continue
    }
    const { data: sent, error: sendError } = await supabase.functions.invoke('send-transactional-email', { body: {
      templateName: row.template_name,
      recipientEmail: userData.user.email,
      idempotencyKey: row.event_key,
      templateData: renderData(row.template_name, row.template_data as Record<string, unknown>),
    } })
    if (sendError || sent?.success !== true) {
      await supabase.from('mentorship_email_outbox').update({ status: 'failed', last_error: 'Transactional email enqueue failed' }).eq('id', row.id)
      continue
    }
    await supabase.from('mentorship_email_outbox').update({ status: 'queued', processed_at: new Date().toISOString(), last_error: null }).eq('id', row.id)
    queued++
  }
  return new Response(JSON.stringify({ success: true, queued }), { headers: jsonHeaders })
})
