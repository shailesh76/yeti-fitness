'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, RefreshCw, Utensils } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { aggregateNutrition, dashboardDateKey, localDayBounds, type CoachClient, type MealLogRow } from '@/lib/coachHubData';
import { fetchCoachClients } from '@/lib/coachHubQueries';

const today = () => dashboardDateKey(new Date());

export default function NutritionPage() {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [athleteId, setAthleteId] = useState('');
  const [date, setDate] = useState(today);
  const [logs, setLogs] = useState<MealLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const next = await fetchCoachClients();
      setClients(next);
      setAthleteId((current) => current || next[0]?.id || '');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load athletes.'); }
    finally { setLoading(false); }
  }, []);

  const loadLogs = useCallback(async () => {
    if (!athleteId) { setLogs([]); return; }
    setLoading(true); setError(null);
    const bounds = localDayBounds(date);
    const { data, error: queryError } = await supabase
      .from('meal_logs')
      .select('id, user_id, meal_type, servings, logged_at, food:foods(name, calories, protein, carbs, fat)')
      .in('user_id', clients.map((client) => client.id))
      .eq('user_id', athleteId)
      .gte('logged_at', bounds.start)
      .lt('logged_at', bounds.end)
      .order('logged_at', { ascending: true });
    if (queryError) setError(queryError.message); else setLogs((data || []) as unknown as MealLogRow[]);
    setLoading(false);
  }, [athleteId, clients, date]);

  useEffect(() => { void loadClients(); }, [loadClients]);
  useEffect(() => { if (athleteId) void loadLogs(); }, [athleteId, loadLogs]);

  const client = clients.find((item) => item.id === athleteId);
  const totals = useMemo(() => aggregateNutrition(logs), [logs]);
  const targets = [
    ['Calories', totals.calories, client?.dailyCalorieTarget, 'kcal'],
    ['Protein', totals.protein, client?.dailyProteinTarget, 'g'],
    ['Carbohydrates', totals.carbs, client?.dailyCarbTarget, 'g'],
    ['Fat', totals.fat, client?.dailyFatTarget, 'g'],
  ] as const;

  return <main className="min-h-screen bg-[#0B1117] p-6 text-gray-100 md:p-8">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-white">Nutrition</h1><p className="mt-1 text-sm text-gray-400">Daily food logs for your assigned athletes.</p></div>
      <button onClick={() => void loadLogs()} disabled={loading || !athleteId} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm disabled:opacity-50"><RefreshCw size={16}/>Refresh</button>
    </header>
    <section className="mb-6 flex flex-wrap gap-3 border-y border-white/10 py-4">
      <select aria-label="Athlete" value={athleteId} onChange={(event) => setAthleteId(event.target.value)} className="h-10 min-w-56 rounded-md border border-white/10 bg-[#111A23] px-3 text-sm">
        {!clients.length && <option value="">No assigned athletes</option>}{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-[#111A23] px-3 text-sm"><CalendarDays size={16}/><input aria-label="Nutrition date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="bg-transparent"/></label>
    </section>
    {error && <State title="Nutrition unavailable" detail={error}/>}
    {!error && loading && <State title="Loading nutrition" detail="Reading authorized meal logs…"/>}
    {!error && !loading && !clients.length && <State title="No assigned athletes" detail="Athletes linked to your coach account will appear here."/>}
    {!error && !loading && clients.length > 0 && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{targets.map(([label, value, target, unit]) => <div key={label} className="border border-white/10 bg-[#111A23] p-4"><p className="text-xs text-gray-400">{label}</p><p className="mt-2 text-2xl font-bold">{Math.round(value)} <span className="text-sm font-normal text-gray-400">{unit}</span></p><p className="mt-1 text-xs text-gray-500">{target == null ? 'No target set' : `Target ${target} ${unit}`}</p></div>)}</section>
      <section className="mt-6"><h2 className="mb-3 text-sm font-semibold text-white">Meal logs</h2>{!logs.length ? <State title="No meals logged" detail={`${client?.name || 'This athlete'} has no meal logs for this date.`}/> : <div className="divide-y divide-white/10 border-y border-white/10">{logs.map((log) => <div key={log.id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-medium text-white">{log.food?.name || 'Food entry'}</p><p className="text-xs text-gray-400">{log.meal_type} · {Number(log.servings) || 0} serving(s)</p></div><p className="text-sm">{Math.round((Number(log.food?.calories) || 0) * (Number(log.servings) || 0))} kcal</p></div>)}</div>}</section>
      {client && <Link href={`/dashboard/${client.id}`} className="mt-6 inline-block text-sm font-semibold text-blue-400 hover:text-blue-300">Open athlete profile</Link>}
    </>}
  </main>;
}

function State({ title, detail }: { title: string; detail: string }) {
  return <div className="border border-white/10 bg-[#111A23] p-8 text-center"><Utensils className="mx-auto mb-3 text-gray-500"/><h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-gray-400">{detail}</p></div>;
}
