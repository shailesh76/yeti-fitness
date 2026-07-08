"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCoachStore, Exercise } from "@/store/useCoachStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, Plus, Dumbbell, X, FileVideo, Eye } from "lucide-react";

const MUSCLE_GROUPS = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Full Body"];

export default function ExerciseLibraryPage() {
  const router = useRouter();
  const { exercises, getExercises, loading } = useCoachStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("All");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(12);

  useEffect(() => {
    getExercises();
  }, []);

  // Reset limit when filters change
  useEffect(() => {
    setVisibleLimit(12);
  }, [searchQuery, selectedMuscle]);

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (ex.instructions && ex.instructions.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesMuscle = selectedMuscle === "All" || ex.muscleGroup === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const visibleExercises = filteredExercises.slice(0, visibleLimit);
  const hasMore = filteredExercises.length > visibleLimit;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full flex-1 flex flex-col relative pb-16">
      {/* Background grid overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.01) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Dumbbell className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Exercise Library</h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Browse and create custom guides</p>
            </div>
          </div>

          <Button onClick={() => router.push("/exercises/new")} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Exercise
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search exercise name or instructions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 bg-surface border border-white/10 rounded-xl pl-11 pr-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-gray-500 font-semibold"
            />
          </div>

          {/* Muscle Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((mg) => {
              const isSelected = selectedMuscle === mg;
              return (
                <button
                  key={mg}
                  onClick={() => setSelectedMuscle(mg)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    isSelected 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-surface border-white/5 text-gray-400 hover:text-white hover:border-white/10"
                  }`}
                >
                  {mg}
                </button>
              );
            })}
          </div>
        </div>

        {/* Library Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/5 bg-white/[0.01] rounded-2xl p-12 text-center my-8 min-h-[300px]">
            <Dumbbell className="h-10 w-10 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm font-bold">No exercises found</p>
            <p className="text-gray-600 text-xs mt-1 max-w-xs">Try adjusting your search query or choosing a different muscle group filter.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {visibleExercises.map((ex) => (
                <Card key={ex.id} className="flex flex-col justify-between hover:border-white/10 transition-colors p-5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.02]" />
                  
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-black text-lg text-white leading-snug tracking-tight group-hover:text-primary transition-colors">{ex.name}</h3>
                      <Badge variant="default" className="shrink-0 bg-white/5 border border-white/10 text-gray-400 text-[9px] uppercase tracking-wider font-bold">
                        {ex.muscleGroup}
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-6 font-semibold">
                      {ex.instructions || "No instructions provided."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex gap-2">
                      {ex.gif_url && (
                        <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          GIF
                        </span>
                      )}
                      {ex.video_url && (
                        <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                          <FileVideo size={10} /> Video
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setSelectedExercise(ex)}
                      className="flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
                    >
                      <Eye size={14} /> View Guide
                    </button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <Button 
                  onClick={() => setVisibleLimit(prev => prev + 12)}
                  variant="secondary"
                  className="px-8 border border-white/10 hover:border-white/20 transition-all font-black text-xs uppercase tracking-widest text-white"
                >
                  Load More Exercises ({filteredExercises.length - visibleLimit} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Guide Details Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-surface border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            {/* Top Glow Bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary to-blue-400" />
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-white tracking-tight">{selectedExercise.name}</h2>
                  <Badge variant="default" className="bg-primary/15 border border-primary/20 text-primary text-[10px] uppercase tracking-wider font-bold shrink-0">
                    {selectedExercise.muscleGroup}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1.5">Exercise Reference Guide</p>
              </div>

              <button 
                onClick={() => setSelectedExercise(null)}
                className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Media Guide Viewer */}
              <div className="w-full h-80 rounded-2xl bg-black/40 overflow-hidden border border-white/5 flex items-center justify-center relative">
                {selectedExercise.video_url ? (
                  <video 
                    src={selectedExercise.video_url} 
                    controls 
                    autoPlay 
                    loop 
                    muted 
                    className="w-full h-full object-cover" 
                  />
                ) : selectedExercise.gif_url ? (
                  <img 
                    src={selectedExercise.gif_url} 
                    alt={selectedExercise.name} 
                    className="w-full h-full object-contain" 
                  />
                ) : (
                  <div className="text-center text-gray-600">
                    <Dumbbell className="h-10 w-10 mx-auto mb-2 text-gray-700" />
                    <span className="text-xs font-bold uppercase tracking-wider">No visual guide available</span>
                  </div>
                )}
              </div>

              {/* Instructions Detail */}
              <div>
                <h4 className="text-xs text-gray-500 font-black uppercase tracking-widest mb-3">Performance Instructions</h4>
                <div className="bg-black/20 border border-white/5 rounded-2xl p-5 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-semibold">
                  {selectedExercise.instructions || "No custom instructions available for this exercise."}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 flex justify-end">
              <Button onClick={() => setSelectedExercise(null)} variant="secondary" className="px-6">
                Close Guide
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
