'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bot, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { summarizeHealth, type AiHealthPayload, type SystemErrorRow } from '@/lib/adminHealthData';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

async function callAdminData(action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !SUPABASE_URL) throw new Error('An authenticated admin session and Supabase URL are required.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-data?action=${action}&since=${encodeURIComponent(new Date(Date.now() - 7 * 86400_000).toISOString())}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Health data request failed.');
  return payload;
}

export default function AdminHealthPage() {
  const [errors, setErrors] = useState<SystemErrorRow[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const [ai, setAi] = useState<AiHealthPayload>({ total: 0, success: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const [errorPayload, aiPayload] = await Promise.all([callAdminData('system_errors'), callAdminData('ai_logs')]);
      if (!Number.isInteger(errorPayload.error_count) || errorPayload.error_count < 0 || !Array.isArray(errorPayload.errors)) {
        throw new Error('Health telemetry returned an invalid system-error count.');
      }
      setErrors(errorPayload.errors || []);
      setErrorCount(errorPayload.error_count);
      setAi(aiPayload);
    } catch (reason) {
      setFailure(reason instanceof Error ? reason.message : 'Could not load health telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const summary = useMemo(() => summarizeHealth(errorCount, ai), [errorCount, ai]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex items-center justify-between border-b border-slate-800 pb-5">
          <div><div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-400"><ShieldCheck className="h-4 w-4" /> Admin telemetry</div><h1 className="mt-1 text-3xl font-black">System health</h1><p className="mt-1 text-sm text-slate-400">Last seven days from production telemetry.</p></div>
          <button onClick={() => void load()} disabled={loading} aria-label="Refresh health data" className="p-2 text-slate-400 hover:text-white disabled:opacity-50"><RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button>
        </header>
        {failure ? <div className="border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">Health telemetry unavailable: {failure}</div> : loading ? <div className="border border-slate-800 bg-slate-900 p-8 text-sm text-slate-400">Loading telemetry...</div> : <>
          <section className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['System errors', summary.recentErrors, AlertTriangle],
              ['AI requests', summary.aiRequests, Bot],
              ['AI success rate', summary.aiSuccessRate === null ? 'No data' : `${summary.aiSuccessRate}%`, Activity],
              ['AI failures', summary.aiFailures, AlertTriangle],
            ].map(([label, value, Icon]: any) => <div key={label} className="border border-slate-800 bg-slate-900 p-5"><Icon className="h-5 w-5 text-emerald-400" /><div className="mt-3 text-2xl font-black">{value}</div><div className="mt-1 text-xs font-bold uppercase text-slate-500">{label}</div></div>)}
          </section>
          <section className="border border-slate-800 bg-slate-900">
            <h2 className="border-b border-slate-800 px-5 py-4 font-bold">Recent system errors</h2>
            {errors.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">No system errors were recorded in this period.</p> : <div className="divide-y divide-slate-800">{errors.map((row) => <div key={row.id} className="px-5 py-4"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-white">{row.error_type || 'Unknown error'}</span><time className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</time></div><p className="mt-1 break-words text-sm text-slate-300">{row.message}</p><p className="mt-1 text-xs text-slate-500">{row.platform || 'Platform not recorded'}</p></div>)}</div>}
          </section>
        </>}
      </div>
    </main>
  );
}
