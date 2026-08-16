'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, CalendarDays, ChevronRight, Scale } from 'lucide-react';
import { fetchCoachClients } from '@/lib/coachHubQueries';
import type { CoachClient } from '@/lib/coachHubData';
import { supabase } from '@/lib/supabase';
import {
  latestMeasurements,
  MEASUREMENT_LABELS,
  normalizeMeasurements,
  type MeasurementRow,
} from '@/lib/assessmentData';

export default function AssessmentsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [rows, setRows] = useState<ReturnType<typeof normalizeMeasurements>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchCoachClients()
      .then((roster) => {
        if (!active) return;
        setClients(roster);
        setSelectedId((current) => current || roster[0]?.id || '');
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Could not load athletes.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setRows([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    const loadMeasurements = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('measurements')
          .select('id, user_id, type, value, logged_at')
          .eq('user_id', selectedId)
          .order('logged_at', { ascending: true });
        if (!active) return;
        if (queryError) throw queryError;
        setRows(normalizeMeasurements((data || []) as MeasurementRow[]));
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load measurements.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadMeasurements();
    return () => { active = false; };
  }, [selectedId]);

  const latest = useMemo(() => latestMeasurements(rows), [rows]);
  const selected = clients.find((client) => client.id === selectedId);

  return (
    <main className="min-h-screen bg-[#0B1117] p-6 text-gray-100 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button onClick={() => router.push('/dashboard')} className="mb-3 flex items-center gap-2 text-sm text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </button>
            <h1 className="text-3xl font-black text-white">Assessments</h1>
            <p className="mt-1 text-sm text-gray-400">Recorded body measurements for athletes on your roster.</p>
          </div>
          <select
            aria-label="Athlete"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={clients.length === 0}
            className="h-11 min-w-64 rounded-md border border-white/10 bg-[#161C28] px-3 text-sm text-white"
          >
            {clients.length === 0 && <option value="">No athletes available</option>}
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </header>

        {error ? (
          <section className="border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">Couldn&apos;t load assessments: {error}</section>
        ) : loading ? (
          <section className="border border-white/10 bg-[#111923] p-8 text-sm text-gray-400">Loading assessments...</section>
        ) : !selected ? (
          <section className="border border-dashed border-white/10 p-10 text-center text-gray-400">No athletes are linked to this coaching account.</section>
        ) : rows.length === 0 ? (
          <section className="border border-dashed border-white/10 p-10 text-center">
            <Scale className="mx-auto mb-3 h-8 w-8 text-gray-500" />
            <h2 className="font-bold text-white">No measurements recorded</h2>
            <p className="mt-1 text-sm text-gray-400">Measurements logged by {selected.name} will appear here.</p>
            <button onClick={() => router.push(`/dashboard/${selected.id}`)} className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary">
              Open athlete profile <ChevronRight className="h-4 w-4" />
            </button>
          </section>
        ) : (
          <>
            <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {Object.entries(latest).map(([type, row]) => {
                const meta = MEASUREMENT_LABELS[type as keyof typeof MEASUREMENT_LABELS];
                return (
                  <div key={type} className="border border-white/10 bg-[#111923] p-4">
                    <div className="text-xs font-bold uppercase text-gray-500">{meta.label}</div>
                    <div className="mt-2 text-2xl font-black text-white">{row.value} <span className="text-sm text-gray-400">{meta.unit}</span></div>
                    <div className="mt-1 text-xs text-gray-500">{new Date(row.logged_at).toLocaleDateString()}</div>
                  </div>
                );
              })}
            </section>
            <section className="overflow-hidden border border-white/10 bg-[#111923]">
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4 font-bold text-white"><CalendarDays className="h-4 w-4 text-primary" /> Measurement history</div>
              <div className="divide-y divide-white/5">
                {[...rows].reverse().map((row) => {
                  const meta = MEASUREMENT_LABELS[row.type];
                  return (
                    <div key={row.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4">
                      <div><div className="font-semibold text-white">{meta.label}</div><div className="text-xs text-gray-500">{new Date(row.logged_at).toLocaleString()}</div></div>
                      <div className="text-lg font-black text-white">{row.value} <span className="text-xs text-gray-400">{meta.unit}</span></div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
