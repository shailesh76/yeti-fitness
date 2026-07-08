"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCoachStore } from "@/store/useCoachStore";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Users, Activity, TrendingUp, AlertCircle, Search, Filter, ChevronRight, X } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { clients, loading, getClients, invites, getInvites, inviteClient } = useCoachStore();
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    getClients();
  }, []);

  useEffect(() => {
    if (showInviteModal) {
      getInvites();
    }
  }, [showInviteModal]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSubmitting(true);
    setInviteError("");

    const existing = invites.find(i => i.email.toLowerCase() === inviteEmail.toLowerCase());
    if (existing) {
      if (existing.status === 'pending') {
        setInviteError("An invitation to this email is already pending.");
        setInviteSubmitting(false);
        return;
      }
      if (existing.status === 'accepted') {
        setInviteError("This athlete is already connected as your client.");
        setInviteSubmitting(false);
        return;
      }
      if (existing.status === 'declined') {
        const confirmReinvite = confirm("This email previously declined your invite. Do you want to send a new invitation?");
        if (!confirmReinvite) {
          setInviteSubmitting(false);
          return;
        }
        
        try {
          const { error } = await supabase
            .from('client_invites')
            .update({ status: 'pending', created_at: new Date().toISOString() })
            .eq('id', existing.id);
          
          if (error) throw error;
          
          await getInvites();
          setInviteEmail("");
          setInviteSubmitting(false);
          return;
        } catch (err: any) {
          console.error(err);
          setInviteError(err.message || "Failed to send invitation. Please try again.");
          setInviteSubmitting(false);
          return;
        }
      }
    }

    try {
      await inviteClient(inviteEmail);
      setInviteEmail("");
    } catch (err: any) {
      console.error(err);
      setInviteError(err.message || "Failed to send invitation. Please try again.");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const getAdherenceVariant = (score: number) => {
    if (score >= 80) return "green";
    if (score >= 50) return "amber";
    return "red";
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = clients.length;
  const avgAdherence = clients.length 
    ? Math.round(clients.reduce((a, b) => a + b.adherenceScore, 0) / activeCount) 
    : 0;
  const needsAttentionCount = clients.filter(c => c.adherenceScore < 50).length;
  const workoutsToday = 12; // Mock stat for dashboard

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-3xl font-black tracking-tight text-white mb-8">Dashboard</h1>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card glow className="relative overflow-hidden">
          <Users className="absolute top-4 right-4 h-5 w-5 text-gray-500 opacity-50" />
          <div className="text-4xl font-black text-white mb-1">{activeCount}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Clients</div>
        </Card>
        
        <Card className="relative overflow-hidden">
          <Activity className="absolute top-4 right-4 h-5 w-5 text-gray-500 opacity-50" />
          <div className="text-4xl font-black text-white mb-1">{workoutsToday}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Workouts Today</div>
        </Card>

        <Card className="relative overflow-hidden">
          <TrendingUp className="absolute top-4 right-4 h-5 w-5 text-gray-500 opacity-50" />
          <div className="text-4xl font-black text-white mb-1">{avgAdherence}%</div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Avg Adherence</div>
        </Card>

        <Card className="relative overflow-hidden border-red-500/20 bg-red-500/5">
          <AlertCircle className="absolute top-4 right-4 h-5 w-5 text-red-500/50 opacity-50" />
          <div className="text-4xl font-black text-red-400 mb-1">{needsAttentionCount}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-red-500/70">Needs Attention</div>
        </Card>
      </div>

      {/* Roster Table Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-tight text-white">Client Roster</h2>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-md bg-surface border border-white/10 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary w-64"
            />
          </div>
          <button className="flex h-10 items-center justify-center rounded-md bg-surface border border-white/10 px-4 text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </button>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-black hover:bg-opacity-90 transition-colors"
          >
            + Invite Client
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-surface overflow-hidden">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-[#181818] text-xs uppercase font-bold tracking-wider text-gray-500 border-b border-white/10">
            <tr>
              <th className="px-6 py-4">Client</th>
              <th className="px-6 py-4">Last Workout</th>
              <th className="px-6 py-4">Adherence</th>
              <th className="px-6 py-4">Calories (Today)</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><Skeleton className="h-10 w-48" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4 text-right"><Skeleton className="h-6 w-6 ml-auto" /></td>
                </tr>
              ))
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Users className="h-10 w-10 text-gray-600 mb-3" />
                    <p className="text-gray-400 font-semibold">No clients found.</p>
                    <button 
                      onClick={() => setSearch('')}
                      className="mt-4 text-primary text-xs font-bold uppercase tracking-wider"
                    >
                      Clear Search
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const isUnderCal = client.caloriesLogged < client.calorieTarget;
                const calColor = client.caloriesLogged === 0 ? "text-gray-500" : (isUnderCal ? "text-white" : "text-red-400");
                
                return (
                  <tr 
                    key={client.id}
                    onClick={() => router.push(`/dashboard/${client.id}`)}
                    className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={client.initials} colorClass={client.avatarColor} />
                        <div>
                          <div className="font-bold text-white">{client.name}</div>
                          <div className="text-xs text-gray-500 font-semibold">{client.planName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-300">
                      {client.lastWorkout === 0 ? 'Never' : `${Math.ceil((Date.now() - client.lastWorkout) / 86400000)} days ago`}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getAdherenceVariant(client.adherenceScore)}>
                        {client.adherenceScore}%
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <span className={calColor}>{client.caloriesLogged}</span>
                      <span className="text-gray-500"> / {client.calorieTarget} kcal</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="inline-block h-5 w-5 text-gray-600 group-hover:text-primary transition-colors" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1c1b1b] border border-white/10 rounded-2xl w-full max-w-md p-6 overflow-hidden flex flex-col max-h-[85vh] shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Invite Athlete</h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Athlete Email</label>
                <input 
                  type="email"
                  required
                  placeholder="athlete@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full h-11 bg-surface border border-white/10 rounded-lg px-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-gray-500 font-medium"
                />
              </div>
              <button 
                type="submit"
                disabled={inviteSubmitting}
                className="w-full h-11 bg-primary text-black font-black uppercase text-xs tracking-wider rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-colors"
              >
                {inviteSubmitting ? 'Sending...' : 'Send Invitation'}
              </button>
              {inviteError && <p className="text-red-400 text-xs font-semibold">{inviteError}</p>}
            </form>

            <div className="flex-1 overflow-y-auto min-h-0 border-t border-white/5 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Invitation History</h4>
              
              {invites.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-6">No invitations sent yet.</p>
              ) : (
                <div className="space-y-2">
                  {invites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50 border border-white/[0.03]">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-sm font-bold text-white truncate">{inv.email}</p>
                        <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                          Invited {new Date(inv.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={inv.status === 'accepted' ? 'green' : inv.status === 'declined' ? 'red' : 'amber'}>
                        {inv.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
