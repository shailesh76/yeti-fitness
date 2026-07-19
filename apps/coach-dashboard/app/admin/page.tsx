"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Users, AlertTriangle, MessageSquare, Activity, RefreshCw,
  CheckCircle, XCircle, Clock, ChevronRight, Zap, Utensils,
  Dumbbell, Camera, CreditCard, UserCheck, UserPlus, ArrowLeftRight, Trash2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardMetrics {
  users: { totalUsers: number; athletes: number; coaches: number; newSignups: number; wau: number; onboardingPct: number };
  engagement: { workoutsCompleted: number; mealLogs: number; aiChats: number; aiScans: number };
  ai: { total: number; success: number; failed: number; failReasons: Record<string, number> };
  subscriptions: { premium: number; free: number };
}

interface AdminUser {
  id: string; full_name: string; email: string; role: string;
  created_at: string; last_active: string; subscription: string;
  workouts: number; ai_requests: number;
}

interface SystemError {
  id: string; error_type: string; message: string; user_id: string | null;
  platform: string | null; app_version: string | null; stack_trace: string | null; created_at: string;
}

interface AIFailure {
  id: string; athlete_id: string; coach_type: string | null;
  error_reason: string | null; requested_at: string;
  provider: string | null; model: string | null;
}

interface AILogs {
  total: number; success: number; failed: number;
  byType: Record<string, { total: number; success: number; failed: number }>;
  failReasons: Record<string, number>;
  recentFailures: AIFailure[];
}

interface Assignment {
  coach_id: string;
  athlete_id: string;
  created_at: string;
  coach: { full_name: string } | null;
  athlete: { full_name: string } | null;
}

interface AssignmentData {
  coaches: { id: string; full_name: string }[];
  athletes: { id: string; full_name: string }[];
  unassigned: { id: string; full_name: string }[];
  assignments: Assignment[];
}

interface EntitlementUser {
  id: string;
  full_name: string;
  email: string;
  entitlement: {
    plan_id: string; status: string; expires_at: string | null;
    source: string | null; created_at: string;
  } | null;
}

// ── Supabase Edge Function caller ─────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://drkurkhsmjuixccdblrl.supabase.co";

async function callAdminData(action: string, params: Record<string, string> = {}, body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");

  const qs = new URLSearchParams({ action, ...params });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-data?${qs}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.details ? `${b.error}: ${b.details}` : (b.error ?? `HTTP ${res.status}`));
  }
  return res.json();
}

async function callManageEntitlements(action: string, athleteId: string, plan?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-entitlements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, athleteId, plan }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.details ? `${b.error}: ${b.details}` : (b.error ?? `HTTP ${res.status}`));
  }
  return res.json();
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string | number; sub?: string; accent?: string; icon?: React.ElementType;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        {Icon && <Icon size={16} className="text-gray-600" />}
      </div>
      <p className={`text-3xl font-black ${accent ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color = "text-primary" }: {
  icon: React.ElementType; title: string; color?: string;
}) {
  return (
    <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
      <Icon size={18} className={color} />{title}
    </h2>
  );
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-400",
  coach: "bg-primary/20 text-primary",
  athlete: "bg-blue-500/20 text-blue-400",
};
const SUB_BADGE: Record<string, string> = {
  FREE: "bg-gray-700 text-gray-400",
  PRO: "bg-amber-500/20 text-amber-400",
  COACHING: "bg-primary/20 text-primary",
};

function getStartDateISO(range: string): string | undefined {
  if (range === "7d") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (range === "30d") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  if (range === "90d") return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  return undefined;
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "overview" | "users" | "errors" | "ai" | "assignments" | "subscriptions" | "diagnostics";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // State per section
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sysErrors, setSysErrors] = useState<SystemError[]>([]);
  const [errFilter, setErrFilter] = useState({ type: "", platform: "" });
  const [expandedErr, setExpandedErr] = useState<string | null>(null);
  const [aiLogs, setAILogs] = useState<AILogs | null>(null);
  const [aiFeedback, setAIFeedback] = useState<Array<{ id: string; category: string; feedback_text: string; rating: number; created_at: string }>>([]);
  const [diagErrors, setDiagErrors] = useState<SystemError[]>([]);
  const [diagAI, setDiagAI] = useState<AILogs | null>(null);

  // Date range states
  const [overviewRange, setOverviewRange] = useState("all");
  const [errorsRange, setErrorsRange] = useState("30d");
  const [aiRange, setAiRange] = useState("30d");

  // Assignment state
  const [assignData, setAssignData] = useState<AssignmentData | null>(null);
  const [assignModal, setAssignModal] = useState<{ athleteId: string; athleteName: string; currentCoachId?: string } | null>(null);
  const [selectedCoach, setSelectedCoach] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Subscription state
  const [entUsers, setEntUsers] = useState<EntitlementUser[]>([]);
  const [entLoading, setEntLoading] = useState<Record<string, boolean>>({});

  const fetchOverview = useCallback(async () => {
    const params: Record<string, string> = {};
    const startDate = getStartDateISO(overviewRange);
    if (startDate) params.start_date = startDate;

    const [m, fb] = await Promise.all([
      callAdminData("dashboard_metrics", params),
      supabase.from("beta_user_feedback").select("id, category, feedback_text, rating, created_at")
        .order("created_at", { ascending: false }).limit(20),
    ]);
    setMetrics(m);
    if (fb.data) setAIFeedback(fb.data);
  }, [overviewRange]);

  const fetchUsers = useCallback(async () => {
    const data = await callAdminData("users_list");
    setUsers(data.users ?? []);
  }, []);

  const fetchErrors = useCallback(async () => {
    const params: Record<string, string> = {};
    if (errFilter.type) params.error_type = errFilter.type;
    if (errFilter.platform) params.platform = errFilter.platform;
    const startDate = getStartDateISO(errorsRange);
    if (startDate) params.start_date = startDate;

    const data = await callAdminData("system_errors", params);
    setSysErrors(data.errors ?? []);
  }, [errFilter, errorsRange]);

  const fetchAI = useCallback(async () => {
    const params: Record<string, string> = {};
    const startDate = getStartDateISO(aiRange);
    if (startDate) params.start_date = startDate;

    const data = await callAdminData("ai_logs", params);
    setAILogs(data);
  }, [aiRange]);

  const fetchAssignments = useCallback(async () => {
    const data = await callAdminData("list_assignments");
    setAssignData(data);
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    const data = await callAdminData("entitlements_list");
    setEntUsers(data.users ?? []);
  }, []);

  // Diagnostics tab: a focused operational-triage view composed from the same
  // two actions the Errors/AI Usage tabs already use — no new edge function
  // action needed. Recent errors here are split client-side by error_type
  // into Sync/Auth/Other buckets; AI failures use the recentFailures list
  // (actual rows, not just aggregates).
  const fetchDiagnostics = useCallback(async () => {
    const [errs, ai] = await Promise.all([
      callAdminData("system_errors", { since: new Date(Date.now() - 7 * 86400_000).toISOString() }),
      callAdminData("ai_logs", { since: new Date(Date.now() - 7 * 86400_000).toISOString() }),
    ]);
    setDiagErrors(errs.errors ?? []);
    setDiagAI(ai);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "overview") await fetchOverview();
      else if (tab === "users") await fetchUsers();
      else if (tab === "errors") await fetchErrors();
      else if (tab === "ai") await fetchAI();
      else if (tab === "assignments") await fetchAssignments();
      else if (tab === "subscriptions") await fetchSubscriptions();
      else if (tab === "diagnostics") await fetchDiagnostics();
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab, fetchOverview, fetchUsers, fetchErrors, fetchAI, fetchAssignments, fetchSubscriptions, fetchDiagnostics]);

  useEffect(() => { refresh(); }, [refresh]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "assignments", label: "Assignments" },
    { id: "subscriptions", label: "Subscriptions" },
    { id: "errors", label: "Errors" },
    { id: "ai", label: "AI Usage" },
    { id: "diagnostics", label: "Diagnostics" },
  ];

  // ── Assignment helpers ───────────────────────────────────────────────────
  const openAssignModal = (athleteId: string, athleteName: string, currentCoachId?: string) => {
    setAssignModal({ athleteId, athleteName, currentCoachId });
    setSelectedCoach(currentCoachId ?? "");
  };

  const doAssign = async () => {
    if (!assignModal || !selectedCoach) return;
    setAssignLoading(true);
    try {
      await callAdminData("assign_coach", {}, { athlete_id: assignModal.athleteId, coach_id: selectedCoach });
      setAssignModal(null);
      await fetchAssignments();
    } catch (e: any) { setError(e.message); }
    finally { setAssignLoading(false); }
  };

  const doRemove = async (athleteId: string) => {
    if (!confirm("Remove this athlete's coach assignment?")) return;
    try {
      await callAdminData("remove_assignment", {}, { athlete_id: athleteId });
      await fetchAssignments();
    } catch (e: any) { setError(e.message); }
  };

  // ── Entitlement helpers ──────────────────────────────────────────────────
  const doEntitlement = async (athleteId: string, action: "grant" | "revoke", plan?: string) => {
    setEntLoading(p => ({ ...p, [athleteId]: true }));
    try {
      await callManageEntitlements(action, athleteId, plan);
      await fetchSubscriptions();
    } catch (e: any) { setError(e.message); }
    finally { setEntLoading(p => ({ ...p, [athleteId]: false })); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black">Admin Command Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mounted && lastRefresh ? `Last refreshed: ${lastRefresh.toLocaleTimeString()}` : ""}
          </p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl p-4 mb-6 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-900/50 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === t.id ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <>
          {/* Date range filter */}
          <div className="flex items-center gap-2 mb-6 bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 w-fit">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date Filter:</span>
            <select
              value={overviewRange}
              onChange={e => setOverviewRange(e.target.value)}
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          {/* Users section */}
          <section className="mb-8">
            <SectionHeader icon={Users} title="Users" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="Total Users" value={loading ? "…" : metrics?.users.totalUsers ?? 0} icon={Users} />
              <StatCard label="Athletes" value={loading ? "…" : metrics?.users.athletes ?? 0} accent="text-blue-400" icon={UserCheck} />
              <StatCard label="Coaches" value={loading ? "…" : metrics?.users.coaches ?? 0} accent="text-primary" />
              <StatCard label="New (7d)" value={loading ? "…" : metrics?.users.newSignups ?? 0} accent="text-green-400" />
              <StatCard label="WAU" value={loading ? "…" : metrics?.users.wau ?? 0} sub="Active this week" accent="text-cyan-400" />
              <StatCard label="Onboarded" value={loading ? "…" : `${metrics?.users.onboardingPct ?? 0}%`} sub="Beta consent signed" accent="text-amber-400" />
            </div>
          </section>

          {/* Engagement */}
          <section className="mb-8">
            <SectionHeader icon={Activity} title={`Engagement (${overviewRange === "all" ? "All Time" : overviewRange === "7d" ? "Last 7 Days" : overviewRange === "30d" ? "Last 30 Days" : "Last 90 Days"})`} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Workouts Completed" value={loading ? "…" : metrics?.engagement.workoutsCompleted ?? 0} icon={Dumbbell} accent="text-primary" />
              <StatCard label="Meal Logs" value={loading ? "…" : metrics?.engagement.mealLogs ?? 0} icon={Utensils} accent="text-green-400" />
              <StatCard label="AI Coach Chats" value={loading ? "…" : metrics?.engagement.aiChats ?? 0} icon={MessageSquare} accent="text-blue-400" sub={overviewRange === "all" ? "Last 30 days" : "Filtered"} />
              <StatCard label="Food Scans" value={loading ? "…" : metrics?.engagement.aiScans ?? 0} icon={Camera} accent="text-amber-400" sub={overviewRange === "all" ? "Last 30 days" : "Filtered"} />
            </div>
          </section>

          {/* Subscriptions */}
          <section className="mb-8">
            <SectionHeader icon={CreditCard} title="Subscriptions" />
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Premium Users" value={loading ? "…" : metrics?.subscriptions.premium ?? 0} accent="text-amber-400" icon={CreditCard} />
              <StatCard label="Free Users" value={loading ? "…" : metrics?.subscriptions.free ?? 0} accent="text-gray-400" />
            </div>
          </section>

          {/* AI health */}
          <section className="mb-8">
            <SectionHeader icon={Zap} title="AI Health (Last 30 Days)" color="text-amber-400" />
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Total Requests" value={loading ? "…" : metrics?.ai.total ?? 0} />
              <StatCard label="Successful" value={loading ? "…" : metrics?.ai.success ?? 0} accent="text-green-400" />
              <StatCard label="Failed" value={loading ? "…" : metrics?.ai.failed ?? 0}
                accent={(metrics?.ai.failed ?? 0) > 0 ? "text-red-400" : "text-gray-500"} />
            </div>
            {metrics && Object.keys(metrics.ai.failReasons).length > 0 && (
              <div className="mt-3 bg-red-900/10 border border-red-800/30 rounded-xl p-4">
                <p className="text-xs font-bold text-red-400 uppercase mb-2">Top Failure Reasons</p>
                {Object.entries(metrics.ai.failReasons).map(([reason, count]) => (
                  <div key={reason} className="flex justify-between text-xs text-gray-400 py-0.5">
                    <span>{reason}</span><span className="text-red-400 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Feedback */}
          <section>
            <SectionHeader icon={MessageSquare} title={`Beta Feedback (${aiFeedback.length} submissions)`} />
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {loading ? <div className="p-8 text-center text-gray-500">Loading…</div> :
                aiFeedback.length === 0 ? <div className="p-8 text-center text-gray-500">No feedback yet.</div> :
                  <div className="divide-y divide-gray-800 max-h-72 overflow-y-auto">
                    {aiFeedback.map(f => (
                      <div key={f.id} className="p-4 hover:bg-gray-800/50 transition">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{f.category}</span>
                            <span className="text-yellow-400 text-xs">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span>
                          </div>
                          <span className="text-xs text-gray-600 flex items-center gap-1"><Clock size={11} />{fmt(f.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-300">{f.feedback_text}</p>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </section>
        </>
      )}

      {/* ── USERS TAB ────────────────────────────────────────────────────────── */}
      {tab === "users" && (
        <section>
          <SectionHeader icon={Users} title={`All Users (${users.length})`} />
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 p-3 border-b border-gray-800 bg-gray-950 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <span className="col-span-2">Name / Email</span>
              <span>Role</span>
              <span>Plan</span>
              <span>Workouts</span>
              <span>AI Uses</span>
              <span>Last Active</span>
            </div>
            {loading ? <div className="p-8 text-center text-gray-500">Loading users…</div> :
              users.length === 0 ? <div className="p-8 text-center text-gray-500">No users.</div> :
                <div className="divide-y divide-gray-800">
                  {users.map(u => (
                    <div key={u.id}
                      className="grid grid-cols-7 p-3 items-center hover:bg-gray-800/50 transition cursor-pointer"
                      onClick={() => router.push(`/admin/users/${u.id}`)}>
                      <div className="col-span-2">
                        <p className="font-semibold text-sm">{u.full_name || "—"}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full w-fit ${ROLE_BADGE[u.role] ?? "bg-gray-700 text-gray-400"}`}>
                        {u.role}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${SUB_BADGE[u.subscription] ?? "bg-gray-700 text-gray-400"}`}>
                        {u.subscription}
                      </span>
                      <span className="text-sm text-gray-300">{u.workouts}</span>
                      <span className="text-sm text-gray-300">{u.ai_requests}</span>
                      <span className="text-xs text-gray-500">{u.last_active ? fmt(u.last_active) : "—"}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        </section>
      )}

      {/* ── ERRORS TAB ───────────────────────────────────────────────────────── */}
      {tab === "errors" && (
        <section>
          {/* Filters */}
          <div className="flex gap-4 mb-4 items-center">
            <input placeholder="Filter by type…" value={errFilter.type}
              onChange={e => setErrFilter(p => ({ ...p, type: e.target.value }))}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary w-48" />
            <select value={errFilter.platform}
              onChange={e => setErrFilter(p => ({ ...p, platform: e.target.value }))}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
              <option value="">All platforms</option>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
              <option value="web">Web</option>
            </select>
            <select value={errorsRange}
              onChange={e => setErrorsRange(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button onClick={() => refresh()}
              className="bg-primary text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition">
              Apply
            </button>
          </div>

          <SectionHeader icon={AlertTriangle} title={`System Errors (${sysErrors.length})`} color="text-red-400" />
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {loading ? <div className="p-8 text-center text-gray-500">Loading…</div> :
              sysErrors.length === 0 ? (
                <div className="p-6 flex items-center gap-3 text-green-400">
                  <CheckCircle size={18} />
                  <span className="text-sm font-semibold">No errors recorded. 🎉</span>
                </div>
              ) : (
                <div className="divide-y divide-gray-800 max-h-[60vh] overflow-y-auto">
                  {sysErrors.map(e => (
                    <div key={e.id} className="p-4 hover:bg-gray-800/50 transition cursor-pointer"
                      onClick={() => setExpandedErr(expandedErr === e.id ? null : e.id)}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="text-xs font-bold text-red-400 uppercase">{e.error_type}</p>
                              {e.platform && <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{e.platform}</span>}
                              {e.app_version && <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">v{e.app_version}</span>}
                            </div>
                            <p className="text-sm text-gray-300 truncate">{e.message}</p>
                            {e.user_id && <p className="text-xs text-gray-600 mt-0.5">User: {e.user_id}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-600 flex items-center gap-1"><Clock size={11} />{fmt(e.created_at)}</span>
                          <ChevronRight size={14} className={`text-gray-600 transition ${expandedErr === e.id ? "rotate-90" : ""}`} />
                        </div>
                      </div>
                      {expandedErr === e.id && (
                        <div className="mt-4 bg-gray-950 rounded-lg p-4 text-xs text-gray-400 space-y-2 border border-gray-800">
                          <div className="grid grid-cols-2 gap-2">
                            <div><span className="font-bold text-gray-500">User ID:</span> {e.user_id || "None"}</div>
                            <div><span className="font-bold text-gray-500">Timestamp:</span> {fmt(e.created_at)}</div>
                            <div><span className="font-bold text-gray-500">Platform:</span> {e.platform || "—"}</div>
                            <div><span className="font-bold text-gray-500">App Version:</span> {e.app_version || "—"}</div>
                          </div>
                          {e.stack_trace ? (
                            <div className="mt-2">
                              <span className="font-bold text-gray-500 block mb-1">Stack Trace:</span>
                              <pre className="bg-gray-900 rounded p-2.5 overflow-x-auto whitespace-pre-wrap max-h-48 border border-gray-850 font-mono">
                                {e.stack_trace}
                              </pre>
                            </div>
                          ) : (
                            <div className="text-gray-600 italic mt-1">No stack trace available.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </section>
      )}

      {/* ── AI USAGE TAB ─────────────────────────────────────────────────────── */}
      {tab === "ai" && (
        <section>
          {/* Date range filter */}
          <div className="flex items-center gap-2 mb-6 bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 w-fit">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date Filter:</span>
            <select
              value={aiRange}
              onChange={e => setAiRange(e.target.value)}
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <SectionHeader icon={Zap} title={`AI Usage (${aiRange === "all" ? "All Time" : aiRange === "7d" ? "Last 7 Days" : aiRange === "30d" ? "Last 30 Days" : "Last 90 Days"})`} color="text-amber-400" />

          {/* Top stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Requests" value={loading ? "…" : aiLogs?.total ?? 0} />
            <StatCard label="Successful" value={loading ? "…" : aiLogs?.success ?? 0} accent="text-green-400" />
            <StatCard label="Failed" value={loading ? "…" : aiLogs?.failed ?? 0}
              accent={(aiLogs?.failed ?? 0) > 0 ? "text-red-400" : "text-gray-500"} />
          </div>

          {/* Chat vs scan breakdown */}
          {aiLogs && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {(() => {
                const chatStats = { total: 0, success: 0, failed: 0 };
                if (aiLogs.byType?.workout) {
                  chatStats.total += aiLogs.byType.workout.total;
                  chatStats.success += aiLogs.byType.workout.success;
                  chatStats.failed += aiLogs.byType.workout.failed;
                }
                if (aiLogs.byType?.nutrition) {
                  chatStats.total += aiLogs.byType.nutrition.total;
                  chatStats.success += aiLogs.byType.nutrition.success;
                  chatStats.failed += aiLogs.byType.nutrition.failed;
                }
                const scanStats = aiLogs.byType?.nutrition_image ?? { total: 0, success: 0, failed: 0 };

                return (
                  <>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Coach Chats (Workout/Nutrition)</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <p className="text-xl font-black text-white">{loading ? "…" : chatStats.total}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Total</p>
                        </div>
                        <div>
                          <p className="text-xl font-black text-green-400">{loading ? "…" : chatStats.success}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Success</p>
                        </div>
                        <div>
                          <p className="text-xl font-black text-red-400">{loading ? "…" : chatStats.failed}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Failed</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Food scans (Nutrition Images)</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <p className="text-xl font-black text-white">{loading ? "…" : scanStats.total}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Total</p>
                        </div>
                        <div>
                          <p className="text-xl font-black text-green-400">{loading ? "…" : scanStats.success}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Success</p>
                        </div>
                        <div>
                          <p className="text-xl font-black text-red-400">{loading ? "…" : scanStats.failed}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Failed</p>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* By type breakdown */}
          {aiLogs && Object.keys(aiLogs.byType).length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Breakdown by Type</h3>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 p-3 border-b border-gray-800 bg-gray-950 text-xs font-bold text-gray-500 uppercase">
                  <span>Type</span><span>Total</span><span>Success</span><span>Failed</span>
                </div>
                {Object.entries(aiLogs.byType).map(([type, stats]) => (
                  <div key={type} className="grid grid-cols-4 p-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition">
                    <span className="text-sm font-semibold text-gray-300">{type}</span>
                    <span className="text-sm text-white">{stats.total}</span>
                    <span className="text-sm text-green-400">{stats.success}</span>
                    <span className={`text-sm ${stats.failed > 0 ? "text-red-400" : "text-gray-600"}`}>{stats.failed}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failure reasons */}
          {aiLogs && Object.keys(aiLogs.failReasons).length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Failure Reasons</h3>
              <div className="bg-red-900/10 border border-red-800/30 rounded-xl p-4 space-y-2">
                {Object.entries(aiLogs.failReasons)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <div key={reason} className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">{reason}</span>
                      <span className="text-sm text-red-400 font-bold">{count}×</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {loading && <div className="p-8 text-center text-gray-500">Loading AI data…</div>}
        </section>
      )}

      {/* ── ASSIGNMENTS TAB ──────────────────────────────────────────────────── */}
      {tab === "assignments" && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader icon={ArrowLeftRight} title={`Coach Assignments (${assignData?.assignments.length ?? 0} active)`} />
          </div>

          {/* Assigned athletes */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
            <div className="grid grid-cols-4 p-3 border-b border-gray-800 bg-gray-950 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <span>Athlete</span><span>Coach</span><span>Assigned</span><span>Actions</span>
            </div>
            {loading ? <div className="p-8 text-center text-gray-500">Loading…</div> :
              !assignData || assignData.assignments.length === 0 ?
                <div className="p-8 text-center text-gray-500">No assignments yet.</div> :
                <div className="divide-y divide-gray-800">
                  {assignData.assignments.map(a => (
                    <div key={`${a.coach_id}-${a.athlete_id}`} className="grid grid-cols-4 p-3 items-center hover:bg-gray-800/50 transition">
                      <span className="text-sm font-semibold">{(a.athlete as any)?.full_name ?? "—"}</span>
                      <span className="text-sm text-gray-400">{(a.coach as any)?.full_name ?? "—"}</span>
                      <span className="text-xs text-gray-500">{a.created_at ? fmt(a.created_at) : "—"}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openAssignModal(a.athlete_id, (a.athlete as any)?.full_name ?? "Athlete", a.coach_id)}
                          className="flex items-center gap-1 text-xs bg-blue-900/30 text-blue-400 border border-blue-800/50 px-2 py-1 rounded-lg hover:bg-blue-800/40 transition">
                          <ArrowLeftRight size={11} />Transfer
                        </button>
                        <button
                          onClick={() => doRemove(a.athlete_id)}
                          className="flex items-center gap-1 text-xs bg-red-900/30 text-red-400 border border-red-800/50 px-2 py-1 rounded-lg hover:bg-red-800/40 transition">
                          <Trash2 size={11} />Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Unassigned athletes */}
          {!loading && assignData && assignData.unassigned.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                Unassigned Athletes ({assignData.unassigned.length})
              </h3>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-800">
                  {assignData.unassigned.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 hover:bg-gray-800/50 transition">
                      <span className="text-sm font-semibold">{a.full_name ?? "—"}</span>
                      <button
                        onClick={() => openAssignModal(a.id, a.full_name ?? "Athlete")}
                        className="flex items-center gap-1 text-xs bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/30 transition font-bold">
                        <UserPlus size={12} />Assign Coach
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Assign / Transfer Modal */}
          {assignModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
                <h2 className="text-lg font-black mb-1">
                  {assignModal.currentCoachId ? "Transfer Athlete" : "Assign Coach"}
                </h2>
                <p className="text-sm text-gray-400 mb-5">
                  {assignModal.athleteName}
                </p>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Coach</label>
                <select
                  value={selectedCoach}
                  onChange={e => setSelectedCoach(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm mb-5 focus:outline-none focus:border-primary">
                  <option value="">— Choose a coach —</option>
                  {(assignData?.coaches ?? []).map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
                <div className="flex gap-3">
                  <button onClick={() => setAssignModal(null)}
                    className="flex-1 bg-gray-800 text-gray-300 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-700 transition">
                    Cancel
                  </button>
                  <button onClick={doAssign} disabled={!selectedCoach || assignLoading}
                    className="flex-1 bg-primary text-black py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition">
                    {assignLoading ? "Saving…" : (assignModal.currentCoachId ? "Transfer" : "Assign")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── SUBSCRIPTIONS TAB ────────────────────────────────────────────────── */}
      {tab === "subscriptions" && (
        <section>
          <SectionHeader icon={CreditCard} title={`Subscription Management (${entUsers.length} athletes)`} />
          <p className="text-xs text-gray-500 mb-5">
            All changes go through the <code className="bg-gray-800 px-1 rounded">manage-entitlements</code> Edge Function.
            No direct database writes.
          </p>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-5 p-3 border-b border-gray-800 bg-gray-950 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <span className="col-span-2">Name / Email</span>
              <span>Plan</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {loading ? <div className="p-8 text-center text-gray-500">Loading…</div> :
              entUsers.length === 0 ? <div className="p-8 text-center text-gray-500">No athletes found.</div> :
                <div className="divide-y divide-gray-800">
                  {entUsers.map(u => {
                    const ent = u.entitlement;
                    const isLoading = entLoading[u.id];
                    return (
                      <div key={u.id} className="grid grid-cols-5 p-3 items-center hover:bg-gray-800/50 transition">
                        <div className="col-span-2">
                          <p className="font-semibold text-sm">{u.full_name ?? "—"}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>

                        {/* Plan badge */}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
                          !ent ? "bg-gray-700 text-gray-400" :
                          ent.plan_id === "PRO" ? "bg-amber-500/20 text-amber-400" :
                          "bg-primary/20 text-primary"
                        }`}>
                          {ent ? ent.plan_id : "FREE"}
                        </span>

                        {/* Status */}
                        <div>
                          {ent ? (
                            <>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                ent.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"
                              }`}>{ent.status}</span>
                              {ent.expires_at && (
                                <p className="text-xs text-gray-600 mt-0.5">
                                  Exp: {new Date(ent.expires_at).toLocaleDateString("en-AU")}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5 flex-wrap">
                          {!ent || ent.status !== "active" ? (
                            <>
                              <button disabled={isLoading}
                                onClick={() => doEntitlement(u.id, "grant", "PRO")}
                                className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg hover:bg-amber-500/30 disabled:opacity-50 transition font-bold">
                                Grant PRO
                              </button>
                              <button disabled={isLoading}
                                onClick={() => doEntitlement(u.id, "grant", "COACHING")}
                                className="text-xs bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded-lg hover:bg-primary/30 disabled:opacity-50 transition font-bold">
                                Grant Coaching
                              </button>
                            </>
                          ) : (
                            <button disabled={isLoading}
                              onClick={() => {
                                if (confirm(`Revoke ${ent.plan_id} from ${u.full_name}?`)) doEntitlement(u.id, "revoke");
                              }}
                              className="text-xs bg-red-900/30 text-red-400 border border-red-800/50 px-2 py-1 rounded-lg hover:bg-red-800/40 disabled:opacity-50 transition font-bold">
                              {isLoading ? "…" : "Revoke"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        </section>
      )}

      {tab === "diagnostics" && (() => {
        const syncFailures = diagErrors.filter(e => e.error_type === "SYNC_FAILED");
        const authFailures = diagErrors.filter(e => e.error_type === "AUTH_ERROR");
        const otherErrors = diagErrors.filter(e => e.error_type !== "SYNC_FAILED" && e.error_type !== "AUTH_ERROR");
        const aiFailures = diagAI?.recentFailures ?? [];

        const ErrorRow = ({ e }: { e: SystemError }) => (
          <div key={e.id} className="p-3 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-gray-300 truncate">{e.message}</p>
                {e.user_id && <p className="text-xs text-gray-600 mt-0.5">User: {e.user_id}</p>}
              </div>
            </div>
            <span className="text-xs text-gray-600 flex items-center gap-1 shrink-0"><Clock size={11} />{fmt(e.created_at)}</span>
          </div>
        );

        const EmptyState = ({ label }: { label: string }) => (
          <div className="p-6 flex items-center gap-3 text-green-400">
            <CheckCircle size={18} /><span className="text-sm font-semibold">{label}</span>
          </div>
        );

        return (
          <section>
            <p className="text-sm text-gray-500 mb-6">Last 7 days — a focused operational view. For full filtering, use the Errors and AI Usage tabs.</p>

            <SectionHeader icon={AlertTriangle} title={`Recent Errors (${otherErrors.length})`} color="text-red-400" />
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8 divide-y divide-gray-800 max-h-64 overflow-y-auto">
              {loading ? <div className="p-8 text-center text-gray-500">Loading…</div> :
                otherErrors.length === 0 ? <EmptyState label="No general errors recorded. 🎉" /> :
                otherErrors.slice(0, 20).map(e => <ErrorRow key={e.id} e={e} />)}
            </div>

            <SectionHeader icon={Zap} title={`Failed AI Requests (${aiFailures.length})`} color="text-amber-400" />
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8 divide-y divide-gray-800 max-h-64 overflow-y-auto">
              {loading ? <div className="p-8 text-center text-gray-500">Loading…</div> :
                aiFailures.length === 0 ? <EmptyState label="No failed AI requests. 🎉" /> :
                aiFailures.map(f => (
                  <div key={f.id} className="p-3 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <XCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-300">
                          {f.coach_type ?? "unknown"} · {f.provider ?? "—"}/{f.model ?? "—"}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">{f.error_reason ?? "No reason recorded"} · Athlete: {f.athlete_id}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 flex items-center gap-1 shrink-0"><Clock size={11} />{fmt(f.requested_at)}</span>
                  </div>
                ))}
            </div>

            <SectionHeader icon={RefreshCw} title={`Sync Failures (${syncFailures.length})`} color="text-blue-400" />
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8 divide-y divide-gray-800 max-h-64 overflow-y-auto">
              {loading ? <div className="p-8 text-center text-gray-500">Loading…</div> :
                syncFailures.length === 0 ? <EmptyState label="No sync failures recorded. 🎉" /> :
                syncFailures.map(e => <ErrorRow key={e.id} e={e} />)}
            </div>

            <SectionHeader icon={UserCheck} title={`Authentication Failures (${authFailures.length})`} color="text-purple-400" />
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800 max-h-64 overflow-y-auto">
              {loading ? <div className="p-8 text-center text-gray-500">Loading…</div> :
                authFailures.length === 0 ? <EmptyState label="No authentication failures recorded. 🎉" /> :
                authFailures.map(e => <ErrorRow key={e.id} e={e} />)}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
