"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { FileText, Plus, Loader2, AlertTriangle, Dumbbell } from "lucide-react";
import { useCoachStore } from "@/store/useCoachStore";

/**
 * Programs list (Sidebar's "Programs" nav → /dashboard/templates). Previously
 * 404'd: the sidebar linked here, but the only file under app/dashboard/templates
 * was builder/page.tsx (a separate, unrelated mock drag-and-drop screen) — there
 * was no page.tsx at this exact path. This is the smallest correct fix: a real
 * list of this coach's own workout_plans, with an honest loading/empty/error
 * state, that hands off to the existing /plans/builder flow for actually
 * creating one — it does not reimplement or replace that flow.
 */
export default function TemplatesPage() {
  const templates = useCoachStore((s) => s.templates);
  const templatesLoading = useCoachStore((s) => s.templatesLoading);
  const templatesError = useCoachStore((s) => s.templatesError);
  const getTemplates = useCoachStore((s) => s.getTemplates);

  useEffect(() => {
    getTemplates();
  }, [getTemplates]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-screen text-gray-100 bg-[#0B0F17] font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Programs</h1>
          <p className="text-sm text-gray-400 mt-1">Workout templates you&apos;ve built and can assign to athletes.</p>
        </div>
        <Link
          href="/plans/builder"
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20 w-fit"
        >
          <Plus className="h-4 w-4" />
          New Program
        </Link>
      </div>

      {templatesLoading ? (
        <div className="flex items-center justify-center gap-3 text-gray-400 py-24">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">Loading your programs…</span>
        </div>
      ) : templatesError ? (
        <div className="flex flex-col items-center justify-center gap-3 text-center py-24 bg-[#161C28] border border-rose-500/20 rounded-2xl">
          <AlertTriangle className="h-8 w-8 text-rose-400" />
          <p className="text-sm font-bold text-white">Couldn&apos;t load your programs</p>
          <p className="text-xs text-gray-400 max-w-sm">{templatesError}</p>
          <button
            onClick={() => getTemplates()}
            className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 text-center py-24 bg-[#161C28] border border-white/10 rounded-2xl">
          <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400">
            <FileText className="h-8 w-8" />
          </div>
          <p className="text-sm font-bold text-white">No programs yet</p>
          <p className="text-xs text-gray-400 max-w-sm">Build your first workout program to start assigning it to athletes.</p>
          <Link
            href="/plans/builder"
            className="mt-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Build a program
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-[#161C28] border border-white/10 rounded-2xl p-5 hover:border-blue-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                    <Dumbbell className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-white leading-tight">{t.name}</h3>
                <p className="text-xs text-gray-400 mt-1.5">
                  {t.dayCount} {t.dayCount === 1 ? "day" : "days"} · Created{" "}
                  {new Date(t.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
