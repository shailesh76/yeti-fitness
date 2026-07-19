"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, User, Dumbbell, Utensils, Zap, MessageSquare, CreditCard } from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://drkurkhsmjuixccdblrl.supabase.co";

async function callAdminData(action: string, params: Record<string, string> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");
  const qs = new URLSearchParams({ action, ...params });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-data?${qs}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: string | number; icon: React.ElementType; accent?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${accent ? "bg-opacity-10" : "bg-gray-800"}`} style={{ background: accent ? `${accent}18` : undefined }}>
        <Icon size={20} style={{ color: accent ?? "#9ca3af" }} />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callAdminData("user_detail", { user_id: id })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="p-8 text-gray-400 flex items-center gap-3">
      <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
      Loading user details…
    </div>
  );

  if (error) return (
    <div className="p-8 text-red-400">Error: {error}</div>
  );

  const p = data?.profile;
  const e = data?.email;
  const ent = data?.entitlement;
  const s = data?.stats;

  return (
    <div className="p-8 max-w-4xl mx-auto text-white">
      {/* Back */}
      <button onClick={() => router.push("/admin?tab=users")}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition">
        <ArrowLeft size={16} /> Back to Users
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-2xl">
          {p?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <div>
          <h1 className="text-2xl font-black">{p?.full_name ?? "Unknown"}</h1>
          <p className="text-gray-400 text-sm">{e}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
              p?.role === "admin" ? "bg-purple-500/20 text-purple-400" :
              p?.role === "coach" ? "bg-primary/20 text-primary" :
              "bg-blue-500/20 text-blue-400"}`}>
              {p?.role}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              ent ? "bg-amber-500/20 text-amber-400" : "bg-gray-700 text-gray-400"}`}>
              {ent ? ent.plan_id : "FREE"}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Profile</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
          {[
            ["User ID", p?.id],
            ["Full Name", p?.full_name ?? "—"],
            ["Email", e],
            ["Role", p?.role],
            ["Joined", p?.created_at ? new Date(p.created_at).toLocaleDateString("en-AU") : "—"],
            ["Last Active", p?.updated_at ? new Date(p.updated_at).toLocaleDateString("en-AU") : "—"],
            ["Weight", p?.weight_kg ? `${p.weight_kg} kg` : "—"],
            ["Target Calories", p?.daily_calorie_target ? `${p.daily_calorie_target} kcal` : "—"],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between p-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
              <span className="text-sm text-gray-200 font-semibold">{val ?? "—"}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Activity Stats */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Activity</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Workouts Completed" value={s?.workouts ?? 0} icon={Dumbbell} accent="#39ff6a" />
          <StatCard label="Meal Logs" value={s?.meals ?? 0} icon={Utensils} accent="#22c55e" />
          <StatCard label="AI Requests" value={s?.ai_requests ?? 0} icon={Zap} accent="#f59e0b" />
          <StatCard label="Feedback Submitted" value={s?.feedback ?? 0} icon={MessageSquare} accent="#60a5fa" />
        </div>
      </section>

      {/* Subscription */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Subscription</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          {ent ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">Plan</span>
                <span className="text-amber-400 font-bold">{ent.plan_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">Status</span>
                <span className="text-green-400 font-bold">{ent.status}</span>
              </div>
              {ent.expires_at && (
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">Expires</span>
                  <span className="text-gray-300">{new Date(ent.expires_at).toLocaleDateString("en-AU")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">Granted</span>
                <span className="text-gray-300">{new Date(ent.created_at).toLocaleDateString("en-AU")}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-gray-500">
              <CreditCard size={18} />
              <span className="text-sm">Free tier — no active subscription</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
