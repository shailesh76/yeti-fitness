'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Dumbbell, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { activeTodaySessions, relationName, type CoachClient } from '@/lib/coachHubData';
import { fetchCoachClients } from '@/lib/coachHubQueries';

export default function LivePage() {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const roster = await fetchCoachClients();
      setClients(roster);
      const ids = roster.map((client) => client.id);
      if (!ids.length) { setSessions([]); setSets([]); return; }
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const sessionResult = await supabase
        .from('workout_sessions')
        .select('id, athlete_id, name, started_at, completed_at, duration_seconds, plan_days(name)')
        .in('athlete_id', ids)
        .is('completed_at', null)
        .gte('started_at', start.toISOString())
        .order('started_at', { ascending: false });
      if (sessionResult.error) throw sessionResult.error;
      const active = activeTodaySessions(sessionResult.data || []);
      const sessionIds = active.map((session) => session.id);
      if (!sessionIds.length) { setSessions([]); setSets([]); return; }
      const setResult = await supabase.from('session_sets').select('session_id, completed_at').in('session_id', sessionIds).not('completed_at', 'is', null);
      if (setResult.error) throw setResult.error;
      setSessions(active); setSets(setResult.data || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load active sessions.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const names = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);
  const completedSets = useMemo(() => sets.reduce<Record<string, number>>((map, row) => { map[row.session_id] = (map[row.session_id] || 0) + 1; return map; }, {}), [sets]);

  return <main className="min-h-screen bg-[#0B1117] p-6 text-gray-100 md:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold text-white">Live workouts</h1><p className="mt-1 text-sm text-gray-400">Today’s unfinished sessions. Refresh to retrieve the latest recorded sets.</p></div><button onClick={() => void load()} disabled={loading} className="flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm disabled:opacity-50"><RefreshCw size={16}/>Refresh</button></header>
    <section className="mt-7">
      {error ? <State title="Live sessions unavailable" detail={error}/> : loading ? <State title="Loading live sessions" detail="Checking today’s authorized workout sessions…"/> : !sessions.length ? <State title="Nobody is training right now" detail="No assigned athlete has an unfinished session today."/> : <div className="divide-y divide-white/10 border-y border-white/10">{sessions.map((session) => <article key={session.id} className="grid items-center gap-3 py-4 sm:grid-cols-[1fr_auto_auto]"><div><p className="font-semibold text-white">{relationName(session.plan_days) || session.name || 'Workout session'}</p><p className="text-sm text-gray-400">{names.get(session.athlete_id) || 'Athlete'} · started {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div><span className="text-sm text-gray-300">{completedSets[session.id] || 0} completed sets</span><Link href={`/dashboard/${session.athlete_id}`} className="text-sm font-semibold text-blue-400 hover:text-blue-300">Open athlete</Link></article>)}</div>}
    </section>
    <p className="mt-5 text-xs text-gray-500">This view refreshes on request; it does not claim a realtime connection.</p>
  </main>;
}

function State({ title, detail }: { title: string; detail: string }) { return <div className="border border-white/10 bg-[#111A23] p-8 text-center"><Dumbbell className="mx-auto mb-3 text-gray-500"/><h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-gray-400">{detail}</p></div>; }
