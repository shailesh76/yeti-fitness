"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, X, Loader2, AlertTriangle, Users, ChevronRight,
} from 'lucide-react';
import { useCoachStore } from '@/store/useCoachStore';
import {
  filterRoster, programOptions, goalOptions, goalLabel, isNeedsAttention,
  type RosterTab, type RosterSort,
} from '@/lib/rosterFilters';
import { formatRelativeTime } from '@/lib/dashboardMetrics';

export default function AthletesPage() {
  const router = useRouter();
  const clients = useCoachStore((s) => s.clients);
  const loading = useCoachStore((s) => s.loading);
  const clientsError = useCoachStore((s) => s.clientsError);
  const dashboardErrors = useCoachStore((s) => s.dashboardErrors);
  const getClients = useCoachStore((s) => s.getClients);
  const inviteClient = useCoachStore((s) => s.inviteClient);

  const [activeTab, setActiveTab] = useState<RosterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [goalFilter, setGoalFilter] = useState('all');
  const [sortBy, setSortBy] = useState<RosterSort>('last_active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAthleteEmail, setNewAthleteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    getClients();
  }, [getClients]);

  const handleSendInvite = async () => {
    if (!newAthleteEmail) return;
    setInviting(true);
    setInviteMessage(null);
    try {
      await inviteClient(newAthleteEmail.trim());
      setInviteMessage({ text: `Invite sent to ${newAthleteEmail}!` });
      setTimeout(() => {
        setShowAddModal(false);
        setNewAthleteEmail('');
        setInviteMessage(null);
      }, 1500);
    } catch (err: any) {
      setInviteMessage({ text: err.message || 'Failed to send invite.', isError: true });
    } finally {
      setInviting(false);
    }
  };

  const programs = useMemo(() => programOptions(clients), [clients]);
  const goals = useMemo(() => goalOptions(clients), [clients]);
  const filteredAthletes = useMemo(
    () => filterRoster(clients, { tab: activeTab, search: searchQuery, goal: goalFilter, program: programFilter, sort: sortBy }),
    [clients, activeTab, searchQuery, goalFilter, programFilter, sortBy],
  );

  const isInitialLoading = loading && clients.length === 0;
  const needsAttentionCount = clients.filter(isNeedsAttention).length;
  const adherenceUnavailable = !!dashboardErrors.adherence;

  const selectClass = "bg-[#161C28] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500";

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-screen text-gray-100 bg-[#0B1117] font-sans">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Athletes</h1>
          <p className="text-sm text-gray-400 mt-1">
            {isInitialLoading ? 'Loading your roster…' : `${clients.length} ${clients.length === 1 ? 'athlete' : 'athletes'} on your roster`}
          </p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setInviteMessage(null); }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20 w-fit"
        >
          <Plus className="h-4 w-4" />
          Invite Athlete
        </button>
      </div>

      {clientsError && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-rose-300 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Couldn&apos;t load your roster: {clientsError}</span>
          </div>
          <button
            onClick={() => getClients()}
            className="text-xs font-bold text-rose-300 hover:text-white bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg transition-colors shrink-0 w-fit"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── SEARCH + FILTERS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search athletes..."
            className="w-full bg-[#161C28] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className={selectClass}>
            <option value="all">All programs</option>
            {programs.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={goalFilter} onChange={(e) => setGoalFilter(e.target.value)} className={selectClass}>
            <option value="all">All goals</option>
            {goals.map((g) => <option key={g} value={g}>{goalLabel(g)}</option>)}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as RosterSort)} className={selectClass}>
            <option value="last_active">Sort: Last active</option>
            <option value="name">Sort: Name</option>
            <option value="adherence">Sort: Adherence</option>
          </select>
        </div>
      </div>

      {/* ── TABS (only rules the schema can back) ── */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-[#161C28] border border-white/10 text-gray-400 hover:text-white'
          }`}
        >
          All ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab('needs_attention')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'needs_attention' ? 'bg-blue-600 text-white' : 'bg-[#161C28] border border-white/10 text-gray-400 hover:text-white'
          }`}
        >
          Needs attention ({needsAttentionCount})
        </button>
      </div>

      {/* ── ROSTER TABLE ── */}
      <div className="bg-[#161C28] border border-white/10 rounded-2xl overflow-hidden">
        {isInitialLoading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-semibold">Loading athletes…</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 mb-3">
              <Users className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-white">
              {clientsError ? 'Roster unavailable' : 'No athletes yet'}
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              {clientsError
                ? 'We couldn&apos;t load your athletes. Try again above.'
                : 'Invite your first athlete to start coaching them in Yeti.'}
            </p>
            {!clientsError && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Invite an athlete
              </button>
            )}
          </div>
        ) : filteredAthletes.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No athletes match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Athlete</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Program</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Goal</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Weight</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Adherence</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Last workout</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {filteredAthletes.map((athlete) => (
                  <tr
                    key={athlete.id}
                    onClick={() => router.push(`/dashboard/${athlete.id}`)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {athlete.initials}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{athlete.name}</p>
                          <p className="text-xs text-gray-500">
                            {[athlete.age ? `${athlete.age}` : null, athlete.gender].filter(Boolean).join(' • ') || 'Profile incomplete'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-300">{athlete.planName ?? 'Unavailable'}</td>
                    <td className="p-4 text-sm text-gray-300">{goalLabel(athlete.goal)}</td>
                    <td className="p-4 text-sm text-gray-300">
                      {athlete.weight !== null ? `${athlete.weight} kg` : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="p-4 text-sm">
                      {athlete.adherenceScore === null ? (
                        <span className="text-gray-600">{adherenceUnavailable ? 'Unavailable' : '—'}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${athlete.adherenceScore < 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${athlete.adherenceScore}%` }}
                            />
                          </div>
                          <span className="text-gray-300 font-semibold">{athlete.adherenceScore}%</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {athlete.lastWorkout === null
                        ? <span className="text-gray-600">Unavailable</span>
                        : athlete.lastWorkout === 0
                          ? <span className="text-gray-600">Never</span>
                          : formatRelativeTime(athlete.lastWorkout)}
                    </td>
                    <td className="p-4 text-right">
                      <ChevronRight className="h-4 w-4 text-gray-600 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── INVITE MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161C28] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Add New Athlete</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Athlete Email</label>
                <input
                  type="email"
                  value={newAthleteEmail}
                  onChange={(e) => setNewAthleteEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  className="w-full bg-[#0B1117] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {inviteMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold text-center ${
                  inviteMessage.isError
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {inviteMessage.text}
                </div>
              )}

              <button
                onClick={handleSendInvite}
                disabled={!newAthleteEmail || inviting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {inviting ? (
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
