const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { referral_code, referee_id } = await req.json()
    if (!referral_code || !referee_id) {
      return new Response(JSON.stringify({ error: 'referral_code and referee_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Find the referrer by code
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', referral_code)
      .maybeSingle()

    if (!referrerProfile) {
      return new Response(JSON.stringify({ error: 'Invalid referral code' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prevent self-referral
    if (referrerProfile.id === referee_id) {
      return new Response(JSON.stringify({ error: 'Cannot refer yourself' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if referral already exists
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrerProfile.id)
      .eq('referee_id', referee_id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ message: 'Referral already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create or update referral
    await supabase.from('referrals').upsert({
      referrer_id: referrerProfile.id,
      referee_id: referee_id,
      referral_code: referral_code,
      status: 'completed',
      reward_granted: true,
    })

    // Grant 7 days premium to both users
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    for (const userId of [referrerProfile.id, referee_id]) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, tier, current_period_end')
        .eq('user_id', userId)
        .maybeSingle()

      if (sub) {
        const currentEnd = sub.current_period_end ? new Date(sub.current_period_end) : now
        const newEnd = new Date(Math.max(currentEnd.getTime(), now.getTime()) + 7 * 24 * 60 * 60 * 1000)

        await supabase
          .from('subscriptions')
          .update({
            tier: sub.tier === 'free' ? 'pro' : sub.tier,
            current_period_end: newEnd.toISOString(),
            current_period_start: sub.tier === 'free' ? now.toISOString() : undefined,
          })
          .eq('id', sub.id)
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Referral processed, premium granted' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing referral:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
