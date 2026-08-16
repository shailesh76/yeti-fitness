'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculateAnalytics, groupCompletedSessionsByDashboardDay, type AnalyticsMetrics, type CoachClient } from '@/lib/coachHubData';
import { fetchCoachClients } from '@/lib/coachHubQueries';

const ranges = { '7D': 7, '4W': 28, '3M': 90 } as const;

export default function AnalyticsPage() {
  const [range, setRange] = useState<keyof typeof ranges>('7D');
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
      const since = new Date(); since.setDate(since.getDate() - ranges[range]);
      const sessionResult = await supabase.from('workout_sessions').select('id, athlete_id, started_at, completed_at, duration_seconds').in('athlete_id', ids).gte('started_at', since.toISOString()).order('started_at');
      if (sessionResult.error) throw sessionResult.error;
      const authorizedSessionIds = (sessionResult.data || []).map((session) => session.id);
      const setResult = authorizedSessionIds.length
        ? await supabase.from('session_sets').select('session_id, weight, reps, completed_at').in('session_id', authorizedSessionIds).not('completed_at', 'is', null)
        : { data: [], error: null };
      if (setResult.error) throw setResult.error;
      setSessions(sessionResult.data || []); setSets(setResult.data || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load analytics.'); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { void load(); }, [load]);
  const metrics: AnalyticsMetrics = useMemo(() => calculateAnalytics(clients.length, sessions, sets), [clients.length, sessions, sets]);
  const byDay = useMemo(() => groupCompletedSessionsByDashboardDay(sessions), [sessions]);

  return <main className="min-h-screen bg-[#0B1117] p-6 text-gray-100 md:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold text-white">Analytics</h1><p className="mt-1 text-sm text-gray-400">Calculated from completed workout sessions and sets.</p></div><button onClick={() => void load()} disabled={loading} className="flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm disabled:opacity-50"><RefreshCw size={16}/>Refresh</button></header>
    <div className="my-6 flex gap-2 border-y border-white/10 py-4">{Object.keys(ranges).map((item) => <button key={item} onClick={() => setRange(item as keyof typeof ranges)} className={`h-9 px-3 text-sm ${range === item ? 'bg-blue-600 text-white' : 'bg-[#111A23] text-gray-400'}`}>{item}</button>)}</div>
    {error ? <State title="Analytics unavailable" detail={error}/> : loading ? <State title="Loading analytics" detail="Calculating authorized workout metrics…"/> : !clients.length ? <State title="No assigned athletes" detail="Analytics will appear after athletes are linked to your account."/> : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Assigned athletes" value={metrics.activeAthletes}/><Metric label="Completed sessions" value={metrics.completedSessions}/><Metric label="Training volume" value={`${Math.round(metrics.totalVolumeKg).toLocaleString()} kg`}/><Metric label="Average duration" value={metrics.averageDurationMinutes == null ? 'No data' : `${metrics.averageDurationMinutes} min`}/></section>
      <section className="mt-7"><h2 className="mb-3 text-sm font-semibold">Completed sessions over time</h2>{!Object.keys(byDay).length ? <State title="No completed sessions" detail="There are no completed workouts in this period."/> : <div className="divide-y divide-white/10 border-y border-white/10">{Object.entries(byDay).map(([day, count]) => <div key={day} className="flex justify-between py-3"><time className="text-sm text-gray-400">{new Date(`${day}T00:00:00`).toLocaleDateString()}</time><span className="font-semibold">{count}</span></div>)}</div>}</section>
    </>}
  </main>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="border border-white/10 bg-[#111A23] p-4"><p className="text-xs text-gray-400">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>; }
function State({ title, detail }: { title: string; detail: string }) { return <div className="border border-white/10 bg-[#111A23] p-8 text-center"><Activity className="mx-auto mb-3 text-gray-500"/><h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-gray-400">{detail}</p></div>; }
