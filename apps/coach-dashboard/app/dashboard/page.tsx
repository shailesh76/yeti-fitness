"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Bell, Calendar, TrendingUp, Activity, User, Award, Info, Loader2, AlertTriangle,
  AlertCircle, UserPlus, X, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCoachStore } from '@/store/useCoachStore';
import {
  activeAthleteCount, averageAdherence, recentActivity, atRiskAthletes,
  topPerformers, formatRelativeTime, greetingFor, needsAttention, pendingInviteCount,
} from '@/lib/dashboardMetrics';

export default function DashboardHome() {
  const router = useRouter();
  const clients = useCoachStore((s) => s.clients);
  const loading = useCoachStore((s) => s.loading);
  const clientsError = useCoachStore((s) => s.clientsError);
  const dashboardErrors = useCoachStore((s) => s.dashboardErrors);
  const workoutsToday = useCoachStore((s) => s.workoutsToday);
  const getClients = useCoachStore((s) => s.getClients);
  const invites = useCoachStore((s) => s.invites);
  const invitesError = useCoachStore((s) => s.invitesError);
  const getInvites = useCoachStore((s) => s.getInvites);
  const inviteClient = useCoachStore((s) => s.inviteClient);

  const [coachName, setCoachName] = useState('');
  const [greeting, setGreeting] = useState('Hello');
  const [today, setToday] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    getClients();
    getInvites();
  }, [getClients, getInvites]);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setIsInviting(true);
    setInviteMessage(null);
    try {
      await inviteClient(inviteEmail);
      setInviteMessage({ text: 'Invite sent successfully!', isError: false });
      setInviteEmail('');
    } catch (error: any) {
      setInviteMessage({ text: error?.message || 'Failed to send invite.', isError: true });
    } finally {
      setIsInviting(false);
    }
  };

  useEffect(() => {
    // Read the real clock after mount to avoid server/client hydration differences.
    // client-side only (after mount) so server and client render the same initial
    // markup and this can't cause a hydration mismatch.
    const now = new Date();
    setGreeting(greetingFor(now.getHours()));
    setToday(now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setCoachName(data.full_name);
        });
    });
  }, []);

  const isInitialLoading = loading && clients.length === 0;
  const athleteCount = activeAthleteCount(clients);
  const adherence = averageAdherence(clients);
  const activity = recentActivity(clients);
  const atRisk = atRiskAthletes(clients);
  const topPerf = topPerformers(clients);
  const downstreamErrors = Object.values(dashboardErrors).filter(Boolean) as string[];
  const flaggedAthletes = needsAttention(clients);
  const pendingInvites = pendingInviteCount(invites);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-screen text-gray-100 bg-[#0B0F17] font-sans">

      {/* ── TOP BAR / HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {coachName ? `${greeting}, ${coachName}! 👋` : `${greeting}! 👋`}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Here&apos;s what&apos;s happening with your athletes today.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search athletes..."
              className="bg-[#161C28] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 w-48 sm:w-64 transition-colors"
            />
          </div>

          {/* Notifications Bell — no real notification feed exists yet, so no fake unread count */}
          <button className="relative p-2.5 bg-[#161C28] border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
            <Bell className="h-4 w-4 text-gray-300" />
          </button>

          {/* Real date */}
          <button className="flex items-center gap-2 bg-[#161C28] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span>{today || '—'}</span>
          </button>
        </div>
      </div>

      {clientsError && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-rose-300 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Couldn&apos;t load your athlete data: {clientsError}</span>
          </div>
          <button
            onClick={() => getClients()}
            className="text-xs font-bold text-rose-300 hover:text-white bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg transition-colors shrink-0 w-fit"
          >
            Try again
          </button>
        </div>
      )}

      {!clientsError && downstreamErrors.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Some dashboard data is unavailable: {downstreamErrors.join('; ')}</span>
          </div>
          <button onClick={() => getClients()} className="text-xs font-bold text-amber-300 hover:text-white px-3 py-1.5 rounded-lg">Try again</button>
        </div>
      )}

      {/* ── COACH INBOX: NEEDS ATTENTION (preserved) ── */}
      <section className="mb-8">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          Coach Inbox: Needs Attention
        </h2>

        {isInitialLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-semibold">Loading priority list…</span>
          </div>
        ) : flaggedAthletes.length === 0 ? (
          <div className="bg-[#161C28] p-6 rounded-2xl border border-white/10 text-sm text-gray-400">
            {clients.length === 0
              ? 'No athletes yet.'
              : '🟢 All athletes are currently active and hitting their targets!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {flaggedAthletes.map((athlete) => {
              const critical = athlete.adherenceScore !== null && athlete.adherenceScore < 50;
              return (
                <div
                  key={athlete.id}
                  onClick={() => router.push(`/dashboard/${athlete.id}`)}
                  className={`bg-[#161C28] border p-4 rounded-2xl cursor-pointer hover:bg-white/5 transition ${critical ? 'border-rose-900/50' : 'border-amber-900/50'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-2 h-2 rounded-full ${critical ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <h3 className="font-bold text-white">{athlete.name}</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    {athlete.lastWorkout === 0
                      ? 'No recorded workouts'
                      : `Adherence is low (${athlete.adherenceScore}%)`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 1. KPI METRIC CARDS (4 COLUMNS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

        {/* Linked athlete count; the schema has no active/inactive status. */}
        <div className="bg-[#161C28] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Athletes</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <User className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-white">{isInitialLoading || clientsError ? '—' : athleteCount}</span>
              {!isInitialLoading && clientsError && <span className="text-xs font-semibold text-gray-500">Unavailable</span>}
            </div>
          </div>
        </div>

        {/* Workouts Today */}
        <div className="bg-[#161C28] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Workouts Today</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-white">{isInitialLoading || workoutsToday === null ? '—' : workoutsToday}</span>
              {!isInitialLoading && workoutsToday === null && <span className="text-xs font-semibold text-gray-500">Unavailable</span>}
            </div>
          </div>
        </div>

        {/* Program Adherence */}
        <div className="bg-[#161C28] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Program Adherence</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-white">
                {isInitialLoading ? '—' : adherence === null ? '—' : `${adherence}%`}
              </span>
              {!isInitialLoading && adherence === null && (
                <span className="text-xs font-semibold text-gray-500">{dashboardErrors.adherence ? 'Unavailable' : 'No data yet'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Revenue (MTD) — not tracked anywhere in the schema (no subscriptions/payments table), so an honest unavailable state instead of a fabricated dollar figure */}
        <div className="bg-[#161C28] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Revenue (MTD)</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black text-gray-500">Not tracked</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Billing isn&apos;t connected yet.</p>
          </div>
        </div>

      </div>

      {/* ── 2. MIDDLE SECTION (3 COLUMNS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* COLUMN 1: TODAY'S SCHEDULE — no appointment/scheduling table exists yet */}
        <div className="bg-[#161C28] border border-white/10 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="h-4 w-4 text-blue-400" />
            <h2 className="font-bold text-white text-base">Today&apos;s Schedule</h2>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <Info className="h-6 w-6 text-gray-600 mb-3" />
            <p className="text-sm font-bold text-gray-300">Scheduling isn&apos;t available yet</p>
            <p className="text-xs text-gray-500 mt-1 max-w-[220px]">Session-by-session appointments aren&apos;t tracked in Yeti yet.</p>
          </div>
        </div>

        {/* COLUMN 2: RECENT ACTIVITY — each athlete's real most recent completed workout */}
        <div className="bg-[#161C28] border border-white/10 rounded-2xl p-6">
          <h2 className="font-bold text-white text-base mb-5">Recent Activity</h2>

          {isInitialLoading ? (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-10">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-semibold">Loading…</span>
            </div>
          ) : dashboardErrors.workouts ? (
            <p className="text-sm text-gray-500 text-center py-10">Recent activity is unavailable.</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">No recent workouts logged yet.</p>
          ) : (
            <div className="space-y-4">
              {activity.map((a) => (
                <div key={a.clientId} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {a.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-200">
                      <span className="font-bold text-white">{a.clientName}</span> completed{' '}
                      {a.planName ? <span className="text-blue-400 font-semibold">{a.planName}</span> : <span>a workout</span>}
                    </p>
                    <span className="text-[11px] text-gray-500">{formatRelativeTime(a.lastWorkout)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMN 3: STACKED (TASKS & REMINDERS + AI COACH INSIGHTS) */}
        <div className="space-y-6">

          {/* Tasks & Reminders — no coach task/reminder table exists yet */}
          <div className="bg-[#161C28] border border-white/10 rounded-2xl p-6">
            <h2 className="font-bold text-white text-base mb-4">Tasks & Reminders</h2>
            <div className="flex flex-col items-center justify-center text-center py-6">
              <Info className="h-5 w-5 text-gray-600 mb-2" />
              <p className="text-xs text-gray-500">Task tracking isn&apos;t available yet.</p>
            </div>
          </div>

          {/* AI Coach Insights Card — generic, no fabricated specific claim */}
          <div className="bg-[#161C28] border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden bg-gradient-to-br from-blue-900/20 to-transparent">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
                <span className="text-2xl">🐻‍❄️</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>✨ AI Coach Insights</span>
                </div>
                <p className="text-sm font-medium text-gray-200 mb-4">
                  See personalized coaching insights for each of your athletes.
                </p>
                <button
                  onClick={() => router.push('/dashboard/athletes')}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
                >
                  View Athletes
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── 3. BOTTOM SECTION (2 EQUAL COLUMNS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* AT-RISK ATHLETES — real lowest adherenceScore */}
        <div className="bg-[#161C28] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white text-base">At-Risk Athletes</h2>
            <button
              onClick={() => router.push('/dashboard/athletes')}
              className="text-xs font-bold text-gray-400 hover:text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              View All
            </button>
          </div>

          {isInitialLoading ? (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-10">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-semibold">Loading…</span>
            </div>
          ) : dashboardErrors.adherence && clients.every((client) => client.adherenceScore === null) ? (
            <p className="text-sm text-gray-500 text-center py-10">Adherence ranking is unavailable.</p>
          ) : atRisk.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              {clients.length === 0 ? 'No athletes yet.' : 'Not enough athletes yet to rank adherence.'}
            </p>
          ) : (
            <div className="space-y-4">
              {atRisk.map((a) => (
                <div key={a.clientId} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                    <div className="w-9 h-9 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {a.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-white truncate">{a.clientName}</p>
                        <span className="text-xs font-bold text-gray-400">{a.adherenceScore}%</span>
                      </div>
                      <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${a.adherenceScore}%` }} />
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg shrink-0">
                    Needs attention
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TOP PERFORMERS — real highest adherenceScore, no "Yeti Score" (doesn't exist) or fabricated rank delta */}
        <div className="bg-[#161C28] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white text-base">Top Performers</h2>
            <button
              onClick={() => router.push('/dashboard/athletes')}
              className="text-xs font-bold text-gray-400 hover:text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              View All
            </button>
          </div>

          {isInitialLoading ? (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-10">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-semibold">Loading…</span>
            </div>
          ) : dashboardErrors.adherence && clients.every((client) => client.adherenceScore === null) ? (
            <p className="text-sm text-gray-500 text-center py-10">Adherence ranking is unavailable.</p>
          ) : topPerf.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              {clients.length === 0 ? 'No athletes yet.' : 'Not enough athletes yet to rank adherence.'}
            </p>
          ) : (
            <div className="space-y-4">
              {topPerf.map((a, i) => (
                <div key={a.clientId} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0">
                      {i + 1}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {a.initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{a.clientName}</p>
                      <p className="text-xs text-gray-400">Adherence: <span className="font-bold text-white">{a.adherenceScore}%</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── ROSTER OVERVIEW + INVITE (preserved) ── */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Roster Overview</h2>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-400">
              Pending invites:{' '}
              <span className="text-white font-bold">
                {invitesError ? 'Unavailable' : pendingInvites}
              </span>
            </span>
            <button
              onClick={() => { setShowInviteModal(true); setInviteMessage(null); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-600/20"
            >
              <UserPlus className="h-4 w-4" />
              Invite Client
            </button>
          </div>
        </div>

        <div className="bg-[#161C28] rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/[0.02] flex justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Athlete</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Plan</span>
          </div>
          {isInitialLoading ? (
            <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading roster…</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              {clientsError ? 'Roster unavailable.' : 'No active athletes. Invite one to get started!'}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {clients.map((athlete) => (
                <div
                  key={athlete.id}
                  onClick={() => router.push(`/dashboard/${athlete.id}`)}
                  className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {athlete.initials}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{athlete.name}</p>
                      <p className="text-xs text-gray-500">
                        {athlete.weight ? `Weight: ${athlete.weight}kg` : 'Weight not recorded'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                      {athlete.planName ?? 'Unavailable'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── INVITE MODAL (preserved) ── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161C28] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Invite New Athlete</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Athlete Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {inviteMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold text-center ${
                  inviteMessage.isError
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {inviteMessage.text}
                </div>
              )}

              <button
                onClick={handleInvite}
                disabled={isInviting || !inviteEmail}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending Invite...</span>
                  </>
                ) : (
                  <span>Send Invite Link</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
