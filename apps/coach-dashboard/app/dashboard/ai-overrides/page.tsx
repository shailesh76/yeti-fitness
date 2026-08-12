"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, AlertTriangle, Brain, CheckCircle2, XCircle, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Coach review queue for AI progression recommendations.
 *
 * Backed by the real public.progression_recommendations table. RLS does the
 * isolation: "Coaches read client recommendations" (SELECT) and "Coaches can
 * update client recommendations" (UPDATE) are both EXISTS checks against
 * coach_clients, so a coach only ever sees or acts on their own athletes' rows.
 *
 * Approve/reject write `status`, matching the semantics the athlete detail page
 * already uses. The table has no free-text override column, so there is no
 * "override note" here — see the Phase 3 report for what a future
 * implementation would need.
 */

type RecStatus = "pending" | "approved" | "rejected" | "modified";

interface Recommendation {
  id: string;
  userId: string;
  athleteName: string;
  exerciseName: string;
  suggestionText: string;
  action: string | null;
  suggestedWeight: number | null;
  status: RecStatus;
  createdAt: string;
}

export default function AIOverridesPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user?.id) {
        setRecs([]);
        setError("Your session has expired. Sign in again.");
        return;
      }

      // No coach filter in the query: RLS restricts rows to this coach's
      // athletes server-side, which is the authoritative boundary.
      const { data, error: qErr } = await supabase
        .from("progression_recommendations")
        .select("id, user_id, exercise_name, suggestion_text, action, suggested_weight, status, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (qErr) {
        setRecs([]);
        setError(qErr.message);
        return;
      }

      setRecs(
        (data || []).map((r: any) => {
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          return {
            id: r.id,
            userId: r.user_id,
            athleteName: profile?.full_name || "Unknown athlete",
            exerciseName: r.exercise_name || "Exercise",
            suggestionText: r.suggestion_text || "",
            action: r.action ?? null,
            suggestedWeight: r.suggested_weight ?? null,
            status: (r.status || "pending") as RecStatus,
            createdAt: r.created_at,
          };
        }),
      );
    } catch (e: any) {
      setRecs([]);
      setError(e?.message || "Couldn't load recommendations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (rec: Recommendation, status: "approved" | "rejected") => {
    setActingId(rec.id);
    setActionError(null);
    try {
      const { error: uErr } = await supabase
        .from("progression_recommendations")
        .update({ status })
        .eq("id", rec.id);
      if (uErr) throw uErr;
      await load();
    } catch (e: any) {
      setActionError(e?.message || "Couldn't save that decision.");
    } finally {
      setActingId(null);
    }
  };

  /** Adjusts the prescribed load and records the decision as "modified". */
  const saveModifiedWeight = async (rec: Recommendation) => {
    const raw = weightDrafts[rec.id];
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000) {
      setActionError("Enter a weight between 0 and 1000 kg.");
      return;
    }
    setActingId(rec.id);
    setActionError(null);
    try {
      const { error: uErr } = await supabase
        .from("progression_recommendations")
        .update({ suggested_weight: parsed, status: "modified" })
        .eq("id", rec.id);
      if (uErr) throw uErr;
      setWeightDrafts((prev) => ({ ...prev, [rec.id]: "" }));
      await load();
    } catch (e: any) {
      setActionError(e?.message || "Couldn't save the adjusted weight.");
    } finally {
      setActingId(null);
    }
  };

  const pending = recs.filter((r) => r.status === "pending");
  const decided = recs.filter((r) => r.status !== "pending");

  const statusBadge = (status: RecStatus) => {
    const map: Record<RecStatus, string> = {
      pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      rejected: "text-gray-400 bg-white/5 border-white/10",
      modified: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    };
    return (
      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${map[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto min-h-screen text-gray-100 bg-[#0B0F17] font-sans">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Brain className="h-6 w-6 text-blue-400" />
          AI Review
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Progression suggestions generated for your athletes. Approve, reject, or adjust the load.
        </p>
      </div>

      {actionError && (
        <div className="mb-6 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-300 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 text-gray-400 py-24">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">Loading recommendations…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 text-center py-24 bg-[#161C28] border border-rose-500/20 rounded-2xl">
          <AlertTriangle className="h-8 w-8 text-rose-400" />
          <p className="text-sm font-bold text-white">Couldn&apos;t load recommendations</p>
          <p className="text-xs text-gray-400 max-w-sm">{error}</p>
          <button
            onClick={load}
            className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      ) : recs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 text-center py-24 bg-[#161C28] border border-white/10 rounded-2xl">
          <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400">
            <Info className="h-8 w-8" />
          </div>
          <p className="text-sm font-bold text-white">No AI recommendations yet</p>
          <p className="text-xs text-gray-400 max-w-md">
            Suggestions appear here once the AI coach generates progression recommendations from your
            athletes&apos; logged sessions. Nothing is pending review right now.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-base font-bold text-white mb-4">
              Pending review ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-gray-500 bg-[#161C28] border border-white/10 rounded-2xl p-6">
                Nothing pending — every recommendation has been reviewed.
              </p>
            ) : (
              <div className="space-y-4">
                {pending.map((rec) => (
                  <div key={rec.id} className="bg-[#161C28] border border-white/10 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="text-sm font-bold text-white">{rec.athleteName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {rec.exerciseName}
                          {rec.action ? ` · ${rec.action}` : ""}
                        </p>
                      </div>
                      {statusBadge(rec.status)}
                    </div>

                    {rec.suggestionText && (
                      <p className="text-sm text-gray-300 mb-3">{rec.suggestionText}</p>
                    )}

                    {rec.suggestedWeight !== null && (
                      <p className="text-xs text-gray-400 mb-3">
                        Suggested load: <span className="font-bold text-white">{rec.suggestedWeight} kg</span>
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => decide(rec, "approved")}
                        disabled={actingId === rec.id}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {actingId === rec.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Approve
                      </button>
                      <button
                        onClick={() => decide(rec, "rejected")}
                        disabled={actingId === rec.id}
                        className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>

                      <div className="flex items-center gap-2 ml-auto">
                        <input
                          type="number"
                          value={weightDrafts[rec.id] ?? ""}
                          onChange={(e) => setWeightDrafts((prev) => ({ ...prev, [rec.id]: e.target.value }))}
                          placeholder="Adjust kg"
                          className="w-28 bg-[#0B0F17] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => saveModifiedWeight(rec)}
                          disabled={actingId === rec.id || !weightDrafts[rec.id]}
                          className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/30 px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
                        >
                          Save load
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {decided.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-white mb-4">Reviewed ({decided.length})</h2>
              <div className="bg-[#161C28] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                {decided.map((rec) => (
                  <div key={rec.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{rec.athleteName}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {rec.exerciseName}
                        {rec.suggestedWeight !== null ? ` · ${rec.suggestedWeight} kg` : ""}
                      </p>
                    </div>
                    {statusBadge(rec.status)}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
