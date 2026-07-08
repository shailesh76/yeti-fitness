import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch finished challenges
    const now = new Date().toISOString();
    const { data: activeChallenges, error: chError } = await supabaseClient
      .from('challenges')
      .select('*')
      .lte('end_date', now);

    if (chError) throw chError;

    const results = [];

    for (const challenge of (activeChallenges || [])) {
      // Get leaderboard
      const { data: participants, error: partError } = await supabaseClient
        .from('challenge_participants')
        .select('*, profile:profiles(expo_push_token, full_name)')
        .eq('challenge_id', challenge.id)
        .order('current_value', { ascending: false });

      if (partError) throw partError;

      if (participants && participants.length > 0) {
        const winner = participants[0];
        const token = winner.profile?.expo_push_token;

        if (token) {
          // Send Expo Push Notification to the winner!
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'accept-encoding': 'gzip, deflate',
            },
            body: JSON.stringify({
              to: token,
              sound: 'default',
              title: '🏆 Challenge Winner!',
              body: `Congratulations, you won the "${challenge.title}" challenge with a score of ${winner.current_value}!`,
            }),
          });
        }
        results.push({ challengeId: challenge.id, winner: winner.profile?.full_name });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
