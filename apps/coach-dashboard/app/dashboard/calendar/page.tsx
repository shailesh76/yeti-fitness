'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { buildCalendarEvents, calendarMonthBounds, type CalendarEvent, type CoachClient } from '@/lib/coachHubData';
import { fetchCoachClients } from '@/lib/coachHubQueries';

function monthBounds(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString(), ...calendarMonthBounds(month.getFullYear(), month.getMonth()) };
}

export default function CalendarPage() {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [athleteId, setAthleteId] = useState('all');
  const [month, setMonth] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const roster = await fetchCoachClients();
      setClients(roster);
      const ids = roster.map((client) => client.id);
      if (!ids.length) { setEvents([]); return; }
      const bounds = monthBounds(month);
      const [assignments, sessions] = await Promise.all([
        supabase.from('assigned_plans').select('id, athlete_id, start_date, assigned_at, workout_plans(name)').in('athlete_id', ids).gte('start_date', bounds.startDate).lt('start_date', bounds.endDate),
        supabase.from('workout_sessions').select('id, athlete_id, name, started_at, completed_at, plan_days(name)').in('athlete_id', ids).gte('started_at', bounds.start).lt('started_at', bounds.end).order('started_at'),
      ]);
      if (assignments.error) throw assignments.error;
      if (sessions.error) throw sessions.error;
      setEvents(buildCalendarEvents(assignments.data || [], sessions.data || [], new Map(roster.map((client) => [client.id, client.name]))));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load calendar data.'); }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => athleteId === 'all' ? events : events.filter((event) => event.athleteId === athleteId), [athleteId, events]);
  const moveMonth = (amount: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));

  return <main className="min-h-screen bg-[#0B1117] p-6 text-gray-100 md:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold text-white">Calendar</h1><p className="mt-1 text-sm text-gray-400">Plan start dates and actual workout sessions.</p></div><button onClick={() => void load()} disabled={loading} className="flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm disabled:opacity-50"><RefreshCw size={16}/>Refresh</button></header>
    <div className="my-6 flex flex-wrap items-center gap-3 border-y border-white/10 py-4"><button aria-label="Previous month" onClick={() => moveMonth(-1)} className="p-2"><ChevronLeft/></button><p className="min-w-40 text-center font-semibold">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p><button aria-label="Next month" onClick={() => moveMonth(1)} className="p-2"><ChevronRight/></button><select aria-label="Athlete" value={athleteId} onChange={(event) => setAthleteId(event.target.value)} className="ml-auto h-10 rounded-md border border-white/10 bg-[#111A23] px-3 text-sm"><option value="all">All athletes</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
    {error ? <State title="Calendar unavailable" detail={error}/> : loading ? <State title="Loading calendar" detail="Reading authorized assignments and sessions…"/> : !visible.length ? <State title="No calendar activity" detail="No plan starts or workout sessions were recorded for this month."/> : <div className="divide-y divide-white/10 border-y border-white/10">{visible.map((event) => <article key={event.id} className="grid gap-2 py-4 sm:grid-cols-[140px_1fr_auto]"><time className="text-sm text-gray-400">{new Date(event.date).toLocaleDateString()}</time><div><p className="font-semibold text-white">{event.title}</p><p className="text-sm text-gray-400">{event.athleteName}</p></div><span className="text-xs font-semibold uppercase text-blue-400">{event.kind.replace('_', ' ')}</span></article>)}</div>}
    <p className="mt-5 text-xs text-gray-500">Only explicit plan start dates and recorded sessions are shown. Plan day numbers are not treated as scheduled dates.</p>
  </main>;
}

function State({ title, detail }: { title: string; detail: string }) { return <div className="border border-white/10 bg-[#111A23] p-8 text-center"><CalendarDays className="mx-auto mb-3 text-gray-500"/><h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-gray-400">{detail}</p></div>; }
