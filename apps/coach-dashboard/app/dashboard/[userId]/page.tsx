"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCoachStore, Client, WorkoutLog } from "@/store/useCoachStore";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { NutritionTargetCard } from "@/components/NutritionTargetCard";
import { getCoachProgressPhotos, type ProgressPhotoView } from "@/lib/r2";
import {
  ArrowLeft, MessageSquare, Activity, Heart, Flame, Target,
  CheckCircle2, XCircle, Trash2, Brain, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Zap, BarChart2, Image as ImageIcon, ExternalLink
} from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { createBrowserClient } from "@supabase/ssr";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Supabase client key is missing. Configure NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey,
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressionRec {
  id: string;
  exercise_name: string;
  action: string;
  recommended_weight?: number;
  reasoning: string;
  status: "pending" | "approved" | "rejected" | "modified";
  created_at: string;
}

interface StrengthDataPoint {
  date: string;
  weight: number;
  exercise: string;
}

interface AthleteIntelligence {
  yetiScore: number;
  yetiStatus: string;
  workoutsCompleted14d: number;
  workoutsAssigned14d: number;
  plateauDetected: boolean;
  plateauReason?: string;
  strengthData: Record<string, StrengthDataPoint[]>;
  progressionRecs: ProgressionRec[];
}

// ─── Intelligence Panel ───────────────────────────────────────────────────────

function IntelligencePanel({ athleteId, client }: { athleteId: string; client: Client }) {
  const [intel, setIntel] = useState<AthleteIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchIntelligence = useCallback(async () => {
    setLoading(true);
    try {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Workout completion 14d
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("id, started_at, completed_at")
        .eq("athlete_id", athleteId)
        .gte("started_at", fourteenDaysAgo);

      const completed = (sessions || []).filter((s: any) => s.completed_at !== null).length;
      const assigned = (sessions || []).length;

      // 2. Strength progression (top exercises by volume)
      const { data: sets } = await supabase
        .from("session_sets")
        .select("weight, reps, completed_at, exercises(name), workout_sessions!inner(athlete_id)")
        .eq("workout_sessions.athlete_id", athleteId)
        .not("weight", "is", null)
        .order("completed_at", { ascending: true })
        .limit(200);

      const strengthData: Record<string, StrengthDataPoint[]> = {};
      (sets || []).forEach((s: any) => {
        const exName = (Array.isArray(s.exercises) ? s.exercises[0]?.name : s.exercises?.name) || 'Exercise';
        const weightVal = Number(s.weight) || 0;
        if (!exName || !weightVal) return;
        if (!strengthData[exName]) strengthData[exName] = [];
        const date = s.completed_at ? new Date(s.completed_at).toLocaleDateString("en-AU", { month: "short", day: "numeric" }) : 'Recent';
        // Only add if it's a new max for that date
        const existing = strengthData[exName].find((d) => d.date === date);
        if (!existing || weightVal > existing.weight) {
          if (existing) {
            existing.weight = weightVal;
          } else {
            strengthData[exName].push({ date, weight: weightVal, exercise: exName });
          }
        }
      });

      // 3. AI Recommendations queue
      const { data: recs } = await supabase
        .from("progression_recommendations")
        .select("*")
        .eq("user_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(10);

      // 4. Simple plateau detection (no improvement in top exercise > 3 weeks)
      let plateauDetected = false;
      let plateauReason: string | undefined;
      const topExercise = Object.keys(strengthData).reduce((best, name) => {
        return (strengthData[name].length > (strengthData[best]?.length || 0)) ? name : best;
      }, "");

      if (topExercise && strengthData[topExercise].length >= 3) {
        const data = strengthData[topExercise];
        const oldest = data[0].weight;
        const newest = data[data.length - 1].weight;
        if (newest <= oldest * 1.02) {
          plateauDetected = true;
          plateauReason = `No meaningful progress on ${topExercise} in ${data.length} sessions.`;
        }
      }

      // 5. Simple Yeti Score (50% completion + 50% presence)
      const completionRate = assigned > 0 ? completed / assigned : 0;
      const yetiScore = Math.round(completionRate * 100);
      const yetiStatus = yetiScore >= 70 ? "🟢 Active" : yetiScore >= 40 ? "🟡 At Risk" : "🔴 Churn Risk";

      const topEx = Object.keys(strengthData)[0] || "";
      setSelectedExercise(topEx);

      setIntel({
        yetiScore,
        yetiStatus,
        workoutsCompleted14d: completed,
        workoutsAssigned14d: assigned,
        plateauDetected,
        plateauReason,
        strengthData,
        progressionRecs: (recs || []) as ProgressionRec[],
      });
    } catch (err) {
      console.error("Intel fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  const handleRecAction = async (recId: string, action: "approved" | "rejected") => {
    setActionLoading(recId);
    try {
      await supabase
        .from("progression_recommendations")
        .update({ status: action, reviewed_at: new Date().toISOString() })
        .eq("id", recId);
      await fetchIntelligence();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!intel) return null;

  const exerciseKeys = Object.keys(intel.strengthData);
  const chartData = selectedExercise && intel.strengthData[selectedExercise]
    ? {
        labels: intel.strengthData[selectedExercise].map((d) => d.date),
        datasets: [{
          fill: true,
          label: `${selectedExercise} (kg)`,
          data: intel.strengthData[selectedExercise].map((d) => d.weight),
          borderColor: "#39FF6A",
          backgroundColor: "rgba(57,255,106,0.08)",
          tension: 0.4,
          pointBackgroundColor: "#39FF6A",
          pointRadius: 4,
        }],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#1c1b1b", titleColor: "#fff", bodyColor: "#39FF6A" },
    },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#666" } },
      y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#666" } },
    },
  };

  const pendingRecs = intel.progressionRecs.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      {/* ── Yeti Score ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Yeti Engagement Score
          </h2>
          <span className="text-sm font-bold text-gray-400">{intel.yetiStatus}</span>
        </div>
        <div className="flex items-end gap-6">
          <div>
            <div className="text-6xl font-black text-primary">{intel.yetiScore}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">/ 100</div>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-400 font-semibold mb-1">
                <span>Workout Completion (14d)</span>
                <span>{intel.workoutsCompleted14d}/{intel.workoutsAssigned14d} sessions</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${intel.workoutsAssigned14d > 0 ? (intel.workoutsCompleted14d / intel.workoutsAssigned14d) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Plateau Alert */}
        {intel.plateauDetected && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-amber-400">Plateau Detected</div>
              <div className="text-xs text-gray-400 mt-0.5">{intel.plateauReason}</div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Strength Progression Chart ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Strength Progression
          </h2>
          {exerciseKeys.length > 0 && (
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {exerciseKeys.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          )}
        </div>
        <div className="h-52">
          {chartData ? (
            <Line data={chartData} options={chartOptions as any} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm border border-white/5 rounded-xl border-dashed">
              No strength data recorded yet
            </div>
          )}
        </div>
      </Card>

      {/* ── AI Progression Recommendations ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> AI Recommendations
            {pendingRecs.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary rounded-full">
                {pendingRecs.length} pending
              </span>
            )}
          </h2>
          <button
            onClick={fetchIntelligence}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>

        {intel.progressionRecs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm border border-white/5 border-dashed rounded-xl">
            No AI recommendations yet. They appear after the athlete completes sessions.
          </div>
        ) : (
          <div className="space-y-3">
            {intel.progressionRecs.map((rec) => (
              <div
                key={rec.id}
                className={`p-4 rounded-xl border ${
                  rec.status === "pending"
                    ? "border-primary/30 bg-primary/5"
                    : rec.status === "approved"
                    ? "border-green-500/20 bg-green-500/5"
                    : "border-white/5 bg-white/2 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">{rec.exercise_name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        rec.action === "INCREASE_WEIGHT"
                          ? "bg-green-500/20 text-green-400"
                          : rec.action === "DELOAD"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {rec.action?.replace(/_/g, " ")}
                      </span>
                      {rec.recommended_weight && (
                        <span className="text-xs text-primary font-bold">
                          → {rec.recommended_weight}kg
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{rec.reasoning}</p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {new Date(rec.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {rec.status === "pending" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleRecAction(rec.id, "approved")}
                        disabled={actionLoading === rec.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleRecAction(rec.id, "rejected")}
                        disabled={actionLoading === rec.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  )}

                  {rec.status !== "pending" && (
                    <span className={`text-xs font-bold ${
                      rec.status === "approved" ? "text-green-400" : "text-gray-500"
                    }`}>
                      {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ProgressPhotosPanel({ athleteId }: { athleteId: string }) {
  const [photos, setPhotos] = useState<ProgressPhotoView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setPhotos(await getCoachProgressPhotos(athleteId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load progress photos."); }
    finally { setLoading(false); }
  }, [athleteId]);

  useEffect(() => { void loadPhotos(); }, [loadPhotos]);
  if (loading) return <Card><div className="py-12 text-center text-sm text-gray-500">Loading progress photos...</div></Card>;
  if (error) return <Card><div className="border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">Progress photos unavailable: {error}</div></Card>;
  if (photos.length === 0) return <Card><div className="py-12 text-center"><ImageIcon className="mx-auto mb-3 h-8 w-8 text-gray-600" /><h2 className="font-bold text-white">No progress photos</h2><p className="mt-1 text-sm text-gray-500">Photos uploaded by this athlete will appear here.</p></div></Card>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{photos.map((photo) => <Card key={photo.id} className="overflow-hidden p-0">
    {photo.url ? <a href={photo.url} target="_blank" rel="noreferrer" className="block">
      {/* Signed R2 URLs are short-lived and do not have a stable Next image host. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.notes || `Progress photo from ${new Date(photo.createdAt).toLocaleDateString()}`} className="aspect-[4/5] w-full bg-black/30 object-cover" onError={() => setPhotos((current) => current.map((item) => item.id === photo.id ? { ...item, url: null, error: "Media could not be displayed" } : item))} />
      <span className="sr-only">Open full photo</span>
    </a> : <div className="flex aspect-[4/5] items-center justify-center bg-black/30 px-5 text-center text-sm text-gray-500"><div><ImageIcon className="mx-auto mb-2 h-7 w-7" />{photo.error || "Media unavailable"}</div></div>}
    <div className="p-4"><div className="flex items-center justify-between gap-3"><time className="text-xs font-bold text-gray-400">{new Date(photo.createdAt).toLocaleString()}</time>{photo.url && <ExternalLink className="h-4 w-4 text-gray-600" />}</div>{photo.notes && <p className="mt-2 text-sm text-gray-300">{photo.notes}</p>}</div>
  </Card>)}</div>;
}

type TabKey = "overview" | "training" | "photos" | "intelligence" | "notes";

export default function ClientDetailPage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const { getClientDetail, notes, getTrainerNotes, addTrainerNote, deleteTrainerNote } = useCoachStore();
  const getTemplates = useCoachStore((s) => s.getTemplates);
  const templates = useCoachStore((s) => s.templates);
  const templatesLoading = useCoachStore((s) => s.templatesLoading);
  const templatesError = useCoachStore((s) => s.templatesError);
  const assignExistingPlan = useCoachStore((s) => s.assignExistingPlan);
  const [detailStatus, setDetailStatus] = useState<'ok' | 'unauthenticated' | 'unauthorized' | 'not_found'>('ok');
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ client: Client | null; logs: WorkoutLog[]; weightHistory: { date: string; weight: number }[] } | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversation, setChatConversation] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Set up chat session and real-time subscription
  useEffect(() => {
    if (!isChatOpen || !params.userId) return;

    let activeChannel: any;

    const initChat = async () => {
      setChatLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const coachId = sessionData.session?.user?.id;
        if (!coachId) return;

        // 1. Get or create conversation (DB constraint handles race conditions)
        let convId = "";
        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("athlete_id", params.userId)
          .eq("coach_id", coachId)
          .maybeSingle();

        if (existing) {
          convId = existing.id;
          setChatConversation(existing);
        } else {
          const { data: newConv, error: newConvErr } = await supabase
            .from("conversations")
            .insert({
              athlete_id: params.userId,
              coach_id: coachId,
              title: "Direct Coach Chat"
            })
            .select()
            .single();

          if (newConv) {
            convId = newConv.id;
            setChatConversation(newConv);
            
            // Add members
            await supabase.from("conversation_members").insert([
              { conversation_id: newConv.id, user_id: params.userId },
              { conversation_id: newConv.id, user_id: coachId }
            ]);
          }
        }
        if (convId) {
          // 2. Fetch history (paginated to last 50 messages)
          const { data: msgs } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", convId)
            .order("created_at", { ascending: false })
            .limit(50);

          setChatMessages((msgs || []).reverse());

          // 3. Subscribe to realtime inserts
          activeChannel = supabase
            .channel(`dashboard_room:${convId}`)
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
              (payload) => {
                const newMsg = payload.new;
                setChatMessages((prev) => {
                  if (prev.some(m => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
              }
            )
            .subscribe();
        }
      } catch (err) {
        console.error("Error setting up chat:", err);
      } finally {
        setChatLoading(false);
      }
    };

    initChat();

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [isChatOpen, params.userId]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatConversation?.id) return;
    const text = chatInput.trim();
    setChatInput("");

    const { data: sessionData } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (!coachId) return;

    const tempId = "msg_dashboard_" + Math.random().toString(36).substring(7);

    // Optimistic insert
    const optimistic = {
      id: tempId,
      conversation_id: chatConversation.id,
      sender_id: coachId,
      content: text,
      created_at: new Date().toISOString()
    };
    setChatMessages((prev) => [...prev, optimistic]);

    try {
      await supabase.from("messages").upsert({
        id: tempId,
        conversation_id: chatConversation.id,
        sender_id: coachId,
        content: text
      }, { onConflict: "id" });

      // Trigger notification for the athlete
      await supabase.from("notifications").insert({
        user_id: params.userId,
        type: "message",
        title: "New Coach Message",
        body: text.substring(0, 100),
        deep_link: "/coach"
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      setChatMessages((prev) => prev.filter(m => m.id !== tempId));
    }
  };

  const loadDetail = useCallback(() => {
    return getClientDetail(params.userId).then((res) => {
      setData(res);
      setDetailStatus(res.status);
      setLoading(false);
    });
  }, [params.userId, getClientDetail]);

  useEffect(() => {
    loadDetail();
    getTrainerNotes(params.userId);
    getTemplates();
  }, [params.userId, getTemplates, getTrainerNotes, loadDetail]);

  const handleAssignPlan = async () => {
    if (!selectedPlanId) return;
    setAssigning(true);
    setAssignMessage(null);
    try {
      const outcome = await assignExistingPlan(selectedPlanId, params.userId, startDate || undefined);
      if (outcome.duplicateSuppressed) {
        // An identical assignment was already in flight; don't claim a second one.
        return;
      }
      setAssignMessage(
        outcome.notified
          ? { text: "Program assigned. The athlete has been notified.", isError: false }
          : { text: "Program assigned, but we couldn't notify the athlete. Let them know directly.", isError: true },
      );
      setSelectedPlanId("");
      setStartDate("");
      await loadDetail();
    } catch (e: any) {
      setAssignMessage({ text: e?.message || "Failed to assign program.", isError: true });
    } finally {
      setAssigning(false);
    }
  };

  const athleteNotes = notes[params.userId] || [];

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setNoteSubmitting(true);
    try {
      await addTrainerNote(params.userId, newNoteText);
      setNewNoteText("");
    } catch (err) {
      console.error(err);
      alert("Failed to add note.");
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteTrainerNote(noteId, params.userId);
    } catch (err) {
      alert("Failed to delete note.");
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-80 w-full mb-8" />
      </div>
    );
  }

  if (!data?.client) {
    // getClientDetail distinguishes these; showing one generic "not found" for an
    // athlete who simply belongs to another coach was misleading.
    const copy = {
      unauthorized: { title: "This athlete is not on your roster", body: "You can only view athletes linked to your coaching account." },
      not_found: { title: "Athlete not found", body: "This profile no longer exists." },
      unauthenticated: { title: "Your session has expired", body: "Sign in again to view this athlete." },
      ok: { title: "Athlete unavailable", body: "No profile data was returned." },
    }[detailStatus];

    return (
      <div className="p-8 text-center">
        <h2 className="text-xl text-white">{copy.title}</h2>
        <p className="text-sm text-gray-400 mt-2">{copy.body}</p>
        <Button onClick={() => router.push("/dashboard/athletes")} className="mt-4">Back to athletes</Button>
      </div>
    );
  }

  const { client, logs, weightHistory } = data;

  const weightChartData = {
    labels: weightHistory.map((w) => w.date),
    datasets: [{
      fill: true,
      label: "Weight (kg)",
      data: weightHistory.map((w) => w.weight),
      borderColor: "#d2f000",
      backgroundColor: "rgba(210, 240, 0, 0.08)",
      tension: 0.4,
      pointBackgroundColor: "#d2f000",
    }],
  };

  const weightChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#1c1b1b", titleColor: "#fff", bodyColor: "#d2f000" },
    },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#888" } },
      y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#888" } },
    },
  };

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "training", label: "Training", icon: BarChart2 },
    { key: "photos", label: "Photos", icon: ImageIcon },
    { key: "intelligence", label: "Intelligence", icon: Brain },
    { key: "notes", label: "Notes", icon: MessageSquare },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push("/dashboard")} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <Avatar initials={client.initials} colorClass={client.avatarColor} className="h-16 w-16 text-2xl" />
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">{client.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm font-bold text-gray-400">{client.planName}</span>
              <span className="text-gray-600">•</span>
              <span className="text-sm font-bold text-primary">{client.weekProgress}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push(`/plans/builder?clientId=${params.userId}`)}>
            Assign Plan
          </Button>
          <Button variant="secondary" onClick={() => setIsChatOpen(true)}>
            <MessageSquare className="mr-2 h-4 w-4" /> Message
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Every value here is nullable — null means "not recorded" or "query
            unavailable", so render an em dash rather than "null" / "null%". */}
        <Card className="relative overflow-hidden">
          <Activity className="absolute top-4 right-4 h-5 w-5 text-gray-500 opacity-50" />
          <div className="text-4xl font-black text-white mb-1">
            {client.weight ?? <span className="text-gray-600">—</span>}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Weight (kg)</div>
        </Card>
        <Card className="relative overflow-hidden">
          <Heart className="absolute top-4 right-4 h-5 w-5 text-gray-500 opacity-50" />
          <div className="text-4xl font-black text-white mb-1">
            {client.wearableConnected && client.avgHeartRate !== null
              ? client.avgHeartRate
              : <span className="text-gray-600">—</span>}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Avg HR</div>
        </Card>
        <Card className="relative overflow-hidden">
          <Flame className="absolute top-4 right-4 h-5 w-5 text-gray-500 opacity-50" />
          <div className="text-4xl font-black text-white mb-1">
            {client.caloriesLogged ?? <span className="text-gray-600">—</span>}
            <span className="text-lg text-gray-600 font-bold ml-1">
              / {client.calorieTarget ?? "—"}
            </span>
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Calories</div>
        </Card>
        <Card className="relative overflow-hidden">
          <Target className="absolute top-4 right-4 h-5 w-5 text-gray-500 opacity-50" />
          <div className="text-4xl font-black text-primary mb-1">
            {client.adherenceScore !== null
              ? `${client.adherenceScore}%`
              : <span className="text-gray-600">—</span>}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-primary/70">Adherence</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/[0.03] p-1 rounded-xl border border-white/5 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.key
                ? "bg-primary text-black"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="h-[380px] flex flex-col">
              <h2 className="text-lg font-bold text-white mb-4">Weight Trend</h2>
              <div className="flex-1 min-h-0">
                {weightHistory.length > 0 ? (
                  <Line data={weightChartData} options={weightChartOptions as any} />
                ) : (
                  <div className="h-full flex items-center justify-center border border-dashed border-white/5 rounded-xl text-sm text-gray-500">
                    No weight data logged yet
                  </div>
                )}
              </div>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="h-[380px] flex flex-col">
              <h2 className="text-lg font-bold text-white mb-4">Recent Sessions</h2>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {logs.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm mt-10">No sessions yet</div>
                ) : logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-200">{log.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(log.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    {log.status === "completed" ? (
                      <Badge variant="green" className="flex items-center gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </Badge>
                    ) : (
                      <Badge variant="default" className="flex items-center gap-1 text-xs opacity-60">
                        <XCircle className="h-3 w-3" /> Skipped
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "training" && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-white mb-1">Assign a program</h2>
          <p className="text-sm text-gray-400 mb-4">
            {client.planName
              ? <>Currently on <span className="text-white font-semibold">{client.planName}</span>. Assigning a new program makes it their current plan; the previous assignment stays in their history.</>
              : "This athlete has no assigned program yet."}
          </p>

          {templatesLoading ? (
            <div className="text-sm text-gray-500">Loading your programs…</div>
          ) : templatesError ? (
            <p className="text-sm text-red-400">Couldn&apos;t load your programs: {templatesError}</p>
          ) : templates.length === 0 ? (
            <div className="text-sm text-gray-500">
              You haven&apos;t built any programs yet.{" "}
              <button onClick={() => router.push("/plans/builder")} className="text-primary font-bold hover:underline">
                Build one
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">Select a program…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.dayCount} {t.dayCount === 1 ? "day" : "days"})
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
                <Button onClick={handleAssignPlan} disabled={!selectedPlanId || assigning}>
                  {assigning ? "Assigning…" : "Assign"}
                </Button>
              </div>
              {assignMessage && (
                <p className={`mt-3 text-xs font-bold ${assignMessage.isError ? "text-red-400" : "text-primary"}`}>
                  {assignMessage.text}
                </p>
              )}
            </>
          )}
        </Card>
      )}

      {activeTab === "training" && (
        <Card>
          <h2 className="text-xl font-bold text-white mb-6">Workout History</h2>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No workout history yet.</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-white">{log.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(log.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                      </div>
                    </div>
                    {log.status === "completed" ? (
                      <Badge variant="green" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </Badge>
                    ) : (
                      <Badge variant="default" className="opacity-60">Skipped</Badge>
                    )}
                  </div>
                  {log.exercises && log.exercises.length > 0 && (
                    <div className="space-y-2 border-t border-white/5 pt-3">
                      {log.exercises.map((ex: any, idx: number) => (
                        <div key={idx} className="text-xs">
                          <div className="font-bold text-gray-300 mb-1">{ex.name}</div>
                          <div className="flex flex-wrap gap-1">
                            {ex.sets.map((s: any, si: number) => (
                              <span key={si} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-gray-400">
                                {s.weight}kg × {s.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "photos" && <ProgressPhotosPanel athleteId={params.userId} />}

      {activeTab === "intelligence" && (
        <div className="space-y-6">
          <IntelligencePanel athleteId={params.userId} client={client} />
          {client && <NutritionTargetCard athleteId={params.userId} athleteName={client.name} />}
        </div>
      )}

      {activeTab === "notes" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Private Coach Notes</h2>
              <p className="text-xs text-gray-500 mt-1">Athlete cannot see these notes.</p>
            </div>
            <Badge variant="default" className="text-[10px] font-bold uppercase tracking-wider">
              Coach Eyes Only
            </Badge>
          </div>
          <form onSubmit={handleAddNote} className="flex gap-3 mb-6">
            <input
              type="text"
              placeholder="Write a private note..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              className="flex-1 h-10 bg-[#131313] border border-white/10 rounded-lg px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-gray-500"
            />
            <Button type="submit" disabled={noteSubmitting || !newNoteText.trim()}>
              Add Note
            </Button>
          </form>
          <div className="space-y-3">
            {athleteNotes.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No notes yet.</p>
            ) : athleteNotes.map((note: any) => (
              <div key={note.id} className="p-4 rounded-lg bg-white/5 border border-white/5 flex justify-between items-start group">
                <div className="flex-1 pr-4">
                  <p className="text-sm text-gray-200 leading-relaxed">{note.note}</p>
                  <p className="text-[10px] text-gray-600 mt-1.5">
                    {new Date(note.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 rounded bg-white/5"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Realtime Chat Drawer */}
      {isChatOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsChatOpen(false)}
          />

          {/* Drawer container */}
          <div className="fixed top-0 right-0 z-50 h-full w-[420px] bg-[#0d0d0d] border-l border-white/10 shadow-2xl flex flex-col animate-slide-in text-white">
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#121212]">
              <div className="flex items-center gap-3">
                <Avatar initials={client.initials} colorClass={client.avatarColor} className="h-10 w-10 text-sm" />
                <div>
                  <h3 className="font-bold text-white text-sm">{client.name}</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Direct Chat</p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#080808]">
              {chatLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No messages yet.</p>
                  <p className="text-xs text-gray-600 mt-1">Send a message to say hello to {client.name}!</p>
                </div>
              ) : (
                chatMessages.map((m) => {
                  const isAthlete = m.sender_id === params.userId;
                  return (
                    <div key={m.id} className={`flex ${isAthlete ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        isAthlete 
                          ? 'bg-white/5 border border-white/5 text-gray-200 rounded-bl-sm' 
                          : 'bg-primary text-black font-semibold rounded-br-sm'
                      }`}>
                        <p className="leading-relaxed break-words">{m.content}</p>
                        <span className={`text-[9px] block mt-1 ${isAthlete ? 'text-gray-500' : 'text-black/60'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-white/10 bg-[#121212]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  placeholder={`Message ${client.name}...`}
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-gray-500"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
