"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCoachStore, Client, WorkoutLog } from "@/store/useCoachStore";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowLeft, MessageSquare, Activity, Heart, Flame, Target, CheckCircle2, XCircle, Trash2 } from "lucide-react";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

export default function ClientDetailPage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const { getClientDetail, notes, getTrainerNotes, addTrainerNote, deleteTrainerNote } = useCoachStore();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ client: Client | null; logs: WorkoutLog[]; weightHistory: { date: string; weight: number }[] } | null>(null);
  
  const [newNoteText, setNewNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  useEffect(() => {
    getClientDetail(params.userId).then((res) => {
      setData(res);
      setLoading(false);
    });
    getTrainerNotes(params.userId);
  }, [params.userId]);

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
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteTrainerNote(noteId, params.userId);
    } catch (err) {
      console.error(err);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-80 w-full mb-8" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data?.client) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl text-white">Client not found</h2>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const { client, logs, weightHistory } = data;

  const chartData = {
    labels: weightHistory.map(w => w.date),
    datasets: [
      {
        fill: true,
        label: 'Weight (lbs)',
        data: weightHistory.map(w => w.weight),
        borderColor: '#d2f000',
        backgroundColor: 'rgba(210, 240, 0, 0.1)',
        tension: 0.4,
        pointBackgroundColor: '#d2f000',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1c1b1b',
        titleColor: '#fff',
        bodyColor: '#d2f000',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#888' } },
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#888' } },
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
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
            Assign Workout Plan
          </Button>
          <Button variant="secondary" onClick={() => alert("Messages coming soon!")}>
            <MessageSquare className="mr-2 h-4 w-4" /> Message
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="relative overflow-hidden">
          <Activity className="absolute top-4 right-4 h-5 w-5 text-gray-500 opacity-50" />
          <div className="text-4xl font-black text-white mb-1">{client.weight}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Current Weight (lbs)</div>
        </Card>
        
        <Card className="relative overflow-hidden">
          <Heart className="absolute top-4 right-4 h-5 w-5 text-gray-500 opacity-50" />
          <div className="text-4xl font-black text-white mb-1">
            {client.wearableConnected ? client.avgHeartRate : '--'}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            Avg Heart Rate
            {client.wearableConnected ? (
              <span className="inline-flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Synced" />
            ) : (
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-500">Not Connected</span>
            )}
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <Flame className="absolute top-4 right-4 h-5 w-5 text-gray-500 opacity-50" />
          <div className="text-4xl font-black text-white mb-1">
            {client.caloriesLogged}
            <span className="text-lg text-gray-600 font-bold ml-1">/ {client.calorieTarget}</span>
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Calories Today</div>
        </Card>

        <Card className="relative overflow-hidden">
          <Target className="absolute top-4 right-4 h-5 w-5 text-gray-500 opacity-50" />
          <div className="text-4xl font-black text-primary mb-1">{client.adherenceScore}%</div>
          <div className="text-xs font-bold uppercase tracking-wider text-primary/70">Adherence Score</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2">
          <Card className="h-[400px] flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6">Weight Trend (6 Weeks)</h2>
            <div className="flex-1 min-h-0">
              {weightHistory.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-white/5 border-dashed rounded-xl bg-white/[0.01]">
                  <span className="text-sm font-bold text-gray-400">No weight data logged yet</span>
                  <span className="text-xs text-gray-600 mt-1 max-w-[280px]">Weight entries recorded by the athlete in the app will appear here.</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Workouts */}
        <div className="lg:col-span-1">
          <Card className="h-[400px] flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6">Recent Workouts</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-gray-250 mb-1">{log.name}</div>
                      <div className="text-xs font-semibold text-gray-500">
                        {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    {log.status === 'completed' ? (
                      <Badge variant="green" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </Badge>
                    ) : (
                      <Badge variant="default" className="flex items-center gap-1 opacity-70">
                        <XCircle className="h-3 w-3" /> Skipped
                      </Badge>
                    )}
                  </div>

                  {log.status === 'completed' && (!log.exercises || log.exercises.length === 0) ? (
                    <div className="border-t border-white/5 pt-3">
                      <span className="text-xs text-gray-500 font-semibold italic">Details unavailable for this earlier workout</span>
                    </div>
                  ) : log.exercises && log.exercises.length > 0 ? (
                    <div className="border-t border-white/5 pt-3 space-y-3">
                      {log.exercises.map((ex: any, idx: number) => (
                        <div key={idx} className="text-xs">
                          <div className="font-bold text-gray-300 mb-1.5">{ex.name}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {ex.sets.map((set: any, sIdx: number) => (
                              <span key={sIdx} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-gray-400">
                                Set {sIdx + 1}: {set.weight}kg x {set.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-10">
                  No recent workouts found.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Private Trainer Notes Section */}
      <Card className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Private Trainer Notes</h2>
            <p className="text-xs text-gray-500 font-semibold mt-1">Only you can view and edit these notes. Athlete will not see them.</p>
          </div>
          <Badge variant="default" className="bg-[#1c1b1b] border border-white/10 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
            Coach Eyes Only
          </Badge>
        </div>

        <form onSubmit={handleAddNote} className="flex gap-4 mb-6">
          <input 
            type="text"
            placeholder="Write a private note about this athlete..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            className="flex-1 h-11 bg-[#131313] border border-white/10 rounded-lg px-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-gray-500"
          />
          <Button type="submit" disabled={noteSubmitting || !newNoteText.trim()}>
            {noteSubmitting ? 'Add Note' : 'Add Note'}
          </Button>
        </form>

        <div className="space-y-4">
          {athleteNotes.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No trainer notes logged yet.</p>
          ) : (
            athleteNotes.map((note) => (
              <div key={note.id} className="p-4 rounded-lg bg-surface/50 border border-white/5 flex justify-between items-start group">
                <div className="flex-1 pr-6">
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{note.note}</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-2">
                    Logged on {new Date(note.created_at).toLocaleDateString(undefined, { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <button 
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/5 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
