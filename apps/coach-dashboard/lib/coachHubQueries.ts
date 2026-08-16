import { supabase } from '@/lib/supabase';
import type { CoachClient } from '@/lib/coachHubData';

export async function fetchCoachClients(): Promise<CoachClient[]> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const coachId = sessionData.session?.user.id;
  if (sessionError || !coachId) throw new Error(sessionError?.message || 'You must be signed in as a coach.');

  const { data, error } = await supabase
    .from('coach_clients')
    .select('athlete:profiles!coach_clients_athlete_id_fkey(id, full_name, daily_calorie_target, daily_protein_target, daily_carb_target, daily_fat_target)')
    .eq('coach_id', coachId);
  if (error) throw new Error(error.message);

  return (data || []).flatMap((row: any) => {
    const profile = Array.isArray(row.athlete) ? row.athlete[0] : row.athlete;
    if (!profile?.id) return [];
    return [{
      id: profile.id,
      name: profile.full_name || 'Unnamed athlete',
      dailyCalorieTarget: profile.daily_calorie_target ?? null,
      dailyProteinTarget: profile.daily_protein_target ?? null,
      dailyCarbTarget: profile.daily_carb_target ?? null,
      dailyFatTarget: profile.daily_fat_target ?? null,
    }];
  });
}
