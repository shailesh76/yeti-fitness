"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Search, SlidersHorizontal, Star, Plus, 
  Heart, Play, ChevronLeft, ChevronRight, Dumbbell, 
  Info, Check, Layers, User, Bookmark, Sparkles, Filter, RefreshCw, AlertCircle, Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ExerciseMediaManager } from '@/components/ExerciseMediaManager';
import { fetchAllExerciseMediaRows, matchesExerciseMediaFilter, type ExerciseMediaCompletenessFilter, type ExerciseMediaRecord } from '@/lib/exerciseMedia';
import { getExercisePrescriptionDisplay } from '../../../../packages/types/src/exercisePrescription';

interface DbExercise {
  id: string;
  name: string;
  slug: string;
  category: string;
  equipment: string;
  primary_muscle: string;
  target_muscle?: string;
  secondary_muscles?: string[];
  movement_pattern?: string;
  difficulty?: string;
  unilateral?: boolean;
  setup_instructions?: string;
  execution_instructions?: string;
  breathing?: string;
  coaching_cues?: string[];
  common_mistakes?: string[];
  safety_notes?: string;
  default_sets?: number;
  default_reps?: number;
  default_reps_prescription?: string | null;
  tempo?: string;
  source_type: string;
  source_id?: string;
  license?: string;
  recommended_rest_seconds?: number;
  hypertrophy_reps?: string;
  strength_reps?: string;
  endurance_reps?: string;
  media_status?: string;
  media_notes?: string;
  active?: boolean;
  created_at?: string;
}

interface ExerciseAlias {
  id: string;
  alias: string;
}

interface ExerciseMuscle {
  id: string;
  muscle: string;
  role: string;
}

export default function ExerciseLibraryPage() {
  const router = useRouter();

  // Primary Data State
  const [exercises, setExercises] = useState<DbExercise[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [yetiCount, setYetiCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 16;

  // Selected Exercise & Detail State
  const [selectedExercise, setSelectedExercise] = useState<DbExercise | null>(null);
  const [selectedAliases, setSelectedAliases] = useState<ExerciseAlias[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<ExerciseMuscle[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<ExerciseMediaRecord[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [canManageMedia, setCanManageMedia] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'instructions' | 'muscles' | 'variations'>('overview');

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'yeti_first_party' | 'legacy_catalog' | 'custom'>('yeti_first_party');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [mediaStatusFilter, setMediaStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('az');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Debug Panel Info
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://drkurkhsmjuixccdblrl.supabase.co';

  // Debounce search query input and reset pagination to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Yeti total count on mount
  useEffect(() => {
    async function fetchCounts() {
      try {
        const { count } = await supabase
          .from('exercises')
          .select('*', { count: 'exact', head: true })
          .eq('source_type', 'yeti_first_party');
        if (count !== null) setYetiCount(count);
      } catch (err) {
        console.error('Error fetching Yeti count:', err);
      }
    }
    fetchCounts();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMediaPermission() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!cancelled) setCanManageMedia(data?.role === 'coach' || data?.role === 'admin');
    }
    loadMediaPermission();
    return () => { cancelled = true; };
  }, []);

  // Main Exercises Query Function
  const fetchExercises = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Alias lookup if search query is active
      let aliasMatchedIds: string[] = [];
      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim();
        const pattern = s.replace(/[\s-]+/g, '%');
        const { data: aliasData } = await supabase
          .from('exercise_aliases')
          .select('exercise_id')
          .ilike('alias', `%${pattern}%`);

        if (aliasData && aliasData.length > 0) {
          aliasMatchedIds = Array.from(new Set(aliasData.map(a => a.exercise_id)));
        }
      }

      // 2. Build Base Exercise Query
      let query = supabase
        .from('exercises')
        .select('*', { count: 'exact' });

      // Apply Source Filter
      if (sourceFilter === 'yeti_first_party') {
        query = query.eq('source_type', 'yeti_first_party');
      } else if (sourceFilter === 'legacy_catalog') {
        query = query.eq('source_type', 'legacy_catalog');
      } else if (sourceFilter === 'custom') {
        query = query.eq('source_type', 'custom');
      }

      // Apply Category Filter
      if (categoryFilter !== 'all') {
        query = query.ilike('category', `%${categoryFilter}%`);
      }

      // Apply Equipment Filter
      if (equipmentFilter !== 'all') {
        query = query.ilike('equipment', `%${equipmentFilter}%`);
      }

      // Apply Difficulty Filter
      if (difficultyFilter !== 'all') {
        query = query.ilike('difficulty', `%${difficultyFilter}%`);
      }

      // Apply Search Query (Combines Name, Slug, Equipment, Primary Muscle, Target Muscle, and Alias IDs)
      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim();
        const pattern = s.replace(/[\s-]+/g, '%');
        const orConditions = [
          `name.ilike.%${pattern}%`,
          `slug.ilike.%${pattern}%`,
          `equipment.ilike.%${pattern}%`,
          `primary_muscle.ilike.%${pattern}%`,
          `target_muscle.ilike.%${pattern}%`
        ];

        if (aliasMatchedIds.length > 0) {
          // Format as UUID list in Postgrest syntax
          orConditions.push(`id.in.(${aliasMatchedIds.join(',')})`);
        }

        query = query.or(orConditions.join(','));
      } else if (muscleGroupFilter !== 'all') {
        query = query.or(`primary_muscle.ilike.%${muscleGroupFilter}%,target_muscle.ilike.%${muscleGroupFilter}%`);
      }

      // Apply Sorting
      if (sortBy === 'az') {
        query = query.order('name', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Completeness filtering must happen across the full matching result set before pagination.
      if (mediaStatusFilter === 'all') {
        const from = (page - 1) * pageSize;
        query = query.range(from, from + pageSize - 1);
      }

      const { data, count, error: fetchErr } = await query;

      if (fetchErr) {
        throw fetchErr;
      }

      let nextExercises = data || [];
      let nextTotalCount = count || 0;
      if (mediaStatusFilter !== 'all') {
        if (nextExercises.length < nextTotalCount) {
          throw new Error('The complete matching exercise set could not be loaded for media filtering.');
        }
        const exerciseIds = nextExercises.map((exercise) => exercise.id);
        const mediaByExercise = new Map<string, ExerciseMediaRecord[]>();
        if (exerciseIds.length > 0) {
          const mediaRows = await fetchAllExerciseMediaRows(exerciseIds, async (idChunk, from, to) => {
            const { data, error } = await supabase
              .from('exercise_media')
              .select('id, exercise_id, media_type, file_format, url, r2_key, thumbnail_url, is_primary, media_status, media_notes, created_at')
              .in('exercise_id', idChunk)
              .order('id', { ascending: true })
              .range(from, to);
            return { data: (data || []) as ExerciseMediaRecord[], error };
          });
          for (const row of mediaRows) {
            const rows = mediaByExercise.get(row.exercise_id) ?? [];
            rows.push(row);
            mediaByExercise.set(row.exercise_id, rows);
          }
        }
        const filtered = nextExercises.filter((exercise) =>
          matchesExerciseMediaFilter(mediaByExercise.get(exercise.id) ?? [], mediaStatusFilter as ExerciseMediaCompletenessFilter),
        );
        nextTotalCount = filtered.length;
        const from = (page - 1) * pageSize;
        nextExercises = filtered.slice(from, from + pageSize);
      }
      setExercises(nextExercises);
      setTotalCount(nextTotalCount);

      // Functional state avoids closing over a selection from an earlier fetch.
      setSelectedExercise((current) =>
        nextExercises.length > 0 && current && nextExercises.some((exercise) => exercise.id === current.id)
          ? current
          : nextExercises[0] ?? null,
      );
    } catch (err: any) {
      console.error('Failed to fetch exercises:', err);
      setError(err.message || 'Failed to load exercise library.');
    } finally {
      setLoading(false);
    }
  }, [
    sourceFilter, categoryFilter, muscleGroupFilter, equipmentFilter,
    difficultyFilter, mediaStatusFilter, debouncedSearch, sortBy, page
  ]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const loadExerciseSubDetails = useCallback(async () => {
    const exerciseId = selectedExercise?.id;
    if (!exerciseId) {
      setSelectedAliases([]);
      setSelectedMuscles([]);
      setSelectedMedia([]);
      return;
    }

    setLoadingDetails(true);
    try {
      const [aliasesRes, musclesRes, mediaRes] = await Promise.all([
        supabase.from('exercise_aliases').select('id, alias').eq('exercise_id', exerciseId),
        supabase.from('exercise_muscles').select('id, muscle, role').eq('exercise_id', exerciseId),
        supabase.from('exercise_media').select('id, exercise_id, media_type, file_format, url, r2_key, thumbnail_url, is_primary, media_status, media_notes, created_at').eq('exercise_id', exerciseId),
      ]);
      if (aliasesRes.error) throw aliasesRes.error;
      if (musclesRes.error) throw musclesRes.error;
      if (mediaRes.error) throw mediaRes.error;
      setSelectedAliases(aliasesRes.data || []);
      setSelectedMuscles(musclesRes.data || []);
      setSelectedMedia((mediaRes.data || []) as ExerciseMediaRecord[]);
    } catch (err) {
      console.error('Error fetching sub-details:', err);
      setSelectedMedia([]);
    } finally {
      setLoadingDetails(false);
    }
  }, [selectedExercise?.id]);

  useEffect(() => {
    loadExerciseSubDetails();
  }, [loadExerciseSubDetails]);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="p-6 md:p-8 max-w-[1700px] mx-auto min-h-screen text-gray-100 bg-[#0B1117] font-sans">
      
      {/* ── VISIBLE DEBUG INDICATOR BAR ── */}
      <div className="mb-4 p-3 rounded-xl bg-blue-950/60 border border-blue-500/30 text-xs text-blue-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <Database className="h-4 w-4 text-blue-400 shrink-0" />
          <span><strong>Supabase:</strong> {supabaseUrl}</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-bold">
          <span>Source: <strong className="text-white">{sourceFilter}</strong></span>
          <span>DB Total: <strong className="text-emerald-400">{totalCount}</strong></span>
          <span>Rendered: <strong className="text-white">{exercises.length}</strong></span>
          <span>Page: <strong className="text-white">{page}/{totalPages}</strong></span>
          {debouncedSearch && (
            <span className="bg-blue-600/40 text-blue-200 px-2 py-0.5 rounded">
              Search: &quot;{debouncedSearch}&quot;
            </span>
          )}
        </div>
      </div>

      {/* ── TOP NAV & HEADER BAR ── */}
      <div className="mb-6">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Library</span>
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Exercise Library
            </h1>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              <span>{totalCount.toLocaleString()} Exercises</span>
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              {yetiCount} Yeti First-Party
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={() => fetchExercises()}
              className="flex items-center gap-2 bg-[#161C28] border border-white/10 hover:bg-white/5 text-gray-300 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors"
              title="Refresh Exercises"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button 
              onClick={() => router.push('/exercises/new')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Exercise</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── FILTER CONTROLS BAR (SEARCH + DROPDOWNS) ── */}
      <div className="bg-[#111A23] border border-white/10 rounded-2xl p-4 mb-6 space-y-3">
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises by exact name, alias, equipment, or muscle..."
              className="w-full bg-[#161C28] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Reset Filters */}
          <button 
            onClick={() => {
              setSearchQuery('');
              setSourceFilter('yeti_first_party');
              setCategoryFilter('all');
              setMuscleGroupFilter('all');
              setEquipmentFilter('all');
              setDifficultyFilter('all');
              setMediaStatusFilter('all');
              setPage(1);
            }}
            className="flex items-center gap-2 bg-[#161C28] border border-white/10 hover:bg-white/5 text-gray-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shrink-0"
          >
            <Filter className="h-4 w-4" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Dropdown Selectors Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 text-xs">
          {/* Source Filter */}
          <div>
            <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value as any); setPage(1); }}
              className="w-full bg-[#161C28] border border-blue-500/30 text-blue-300 font-bold rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="yeti_first_party">Yeti First-Party ({yetiCount})</option>
              <option value="legacy_catalog">Existing API/Imported</option>
              <option value="custom">Coach-Created</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#161C28] border border-white/10 rounded-xl px-2.5 py-1.5 text-white focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="chest">Chest</option>
              <option value="back">Back</option>
              <option value="legs">Legs</option>
              <option value="shoulders">Shoulders</option>
              <option value="biceps">Biceps</option>
              <option value="triceps">Triceps</option>
              <option value="core">Core</option>
              <option value="conditioning">Conditioning</option>
              <option value="mobility">Mobility</option>
            </select>
          </div>

          {/* Muscle Group */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Muscle</label>
            <select
              value={muscleGroupFilter}
              onChange={(e) => { setMuscleGroupFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#161C28] border border-white/10 rounded-xl px-2.5 py-1.5 text-white focus:outline-none"
            >
              <option value="all">All Muscles</option>
              <option value="chest">Chest</option>
              <option value="back">Back</option>
              <option value="quadriceps">Quadriceps</option>
              <option value="hamstrings">Hamstrings</option>
              <option value="glutes">Glutes</option>
              <option value="shoulders">Shoulders</option>
              <option value="biceps">Biceps</option>
              <option value="triceps">Triceps</option>
              <option value="calves">Calves</option>
              <option value="abs">Abs / Core</option>
            </select>
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Equipment</label>
            <select
              value={equipmentFilter}
              onChange={(e) => { setEquipmentFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#161C28] border border-white/10 rounded-xl px-2.5 py-1.5 text-white focus:outline-none"
            >
              <option value="all">All Equipment</option>
              <option value="barbell">Barbell</option>
              <option value="dumbbell">Dumbbell</option>
              <option value="cable">Cable Machine</option>
              <option value="machine">Machine</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="resistance band">Resistance Band</option>
              <option value="air bike">Air Bike</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Difficulty</label>
            <select
              value={difficultyFilter}
              onChange={(e) => { setDifficultyFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#161C28] border border-white/10 rounded-xl px-2.5 py-1.5 text-white focus:outline-none"
            >
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Media</label>
            <select
              value={mediaStatusFilter}
              onChange={(e) => { setMediaStatusFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#161C28] border border-white/10 rounded-xl px-2.5 py-1.5 text-white focus:outline-none"
            >
              <option value="all">All</option>
              <option value="complete">Complete</option>
              <option value="missing_gif">Missing GIF</option>
              <option value="missing_video">Missing Video</option>
              <option value="missing_thumbnail">Missing Thumbnail</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#161C28] border border-white/10 rounded-xl px-2.5 py-1.5 text-white focus:outline-none"
            >
              <option value="az">A - Z</option>
              <option value="newest">Recently Added</option>
            </select>
          </div>
        </div>

      </div>

      {/* ── QUICK SOURCE TABS ── */}
      <div className="flex items-center gap-2 mb-6 text-xs font-bold overflow-x-auto pb-1">
        <button
          onClick={() => { setSourceFilter('yeti_first_party'); setPage(1); }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            sourceFilter === 'yeti_first_party' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-[#111A23] text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-300" />
          <span>Yeti First-Party ({yetiCount})</span>
        </button>

        <button
          onClick={() => { setSourceFilter('all'); setPage(1); }}
          className={`px-4 py-2 rounded-xl transition-colors ${
            sourceFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-[#111A23] text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          All Sources
        </button>

        <button
          onClick={() => { setSourceFilter('legacy_catalog'); setPage(1); }}
          className={`px-4 py-2 rounded-xl transition-colors ${
            sourceFilter === 'legacy_catalog' ? 'bg-blue-600 text-white' : 'bg-[#111A23] text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          Imported/Existing Catalog
        </button>
      </div>

      {/* ── ERROR ALERT ── */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <p className="font-bold">Failed to load exercises</p>
            <p className="text-[11px] opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT (4-COLUMN EXERCISE GRID + RIGHT DETAILS PANEL) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── LEFT 8 COLUMNS: 4-COLUMN EXERCISE GRID ── */}
        <div className="lg:col-span-8 space-y-6">
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="bg-[#111A23] border border-white/5 rounded-2xl p-4 animate-pulse h-48 flex flex-col justify-between">
                  <div className="w-full h-24 bg-white/5 rounded-xl mb-3" />
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <div className="bg-[#111A23] border border-white/10 rounded-2xl p-12 text-center text-gray-400 space-y-3">
              <Dumbbell className="h-10 w-10 mx-auto text-gray-600" />
              <h3 className="text-base font-bold text-white">No exercises found</h3>
              <p className="text-xs max-w-sm mx-auto">
                No exercise records matched your filter criteria. Try resetting your search terms or switching to &quot;All Sources&quot;.
              </p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSourceFilter('all');
                  setCategoryFilter('all');
                  setMuscleGroupFilter('all');
                  setEquipmentFilter('all');
                  setDifficultyFilter('all');
                  setMediaStatusFilter('all');
                  setPage(1);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {exercises.map((ex: DbExercise) => {
                const isSelected = selectedExercise?.id === ex.id;
                const isFav = favorites.has(ex.id);
                const isYeti = ex.source_type === 'yeti_first_party';
                const hasMedia = ex.media_status === 'READY';

                return (
                  <div
                    key={ex.id}
                    onClick={() => setSelectedExercise(ex)}
                    className={`bg-[#111A23] border rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:border-blue-500/50 ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-950/10' : 'border-white/10'
                    }`}
                  >
                    <div>
                      {/* Exercise Media Thumbnail Header with Safe Fallback */}
                      <div className="relative w-full h-28 rounded-xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-white/5 overflow-hidden flex flex-col items-center justify-center p-2 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center text-xl font-bold mb-1">
                          🏋️
                        </div>

                        {/* Safe Media Fallback Badge */}
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                          hasMedia ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {hasMedia ? 'Media Available' : 'Media Coming Soon'}
                        </span>

                        {/* Source Tag Badge */}
                        {isYeti && (
                          <span className="absolute top-2 left-2 bg-blue-600/80 text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                            YETI
                          </span>
                        )}

                        {/* Favorite Heart Icon */}
                        <button 
                          onClick={(e) => toggleFavorite(ex.id, e)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-gray-400 hover:text-rose-400 transition-colors"
                        >
                          <Heart className={`h-3.5 w-3.5 ${isFav ? 'text-rose-500 fill-rose-500' : ''}`} />
                        </button>
                      </div>

                      <h3 className="font-bold text-white text-xs line-clamp-1">{ex.name}</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{ex.primary_muscle || 'Full Body'}</p>

                      {/* Subtitle Badges */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[9px] font-bold">
                        <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md capitalize">
                          {ex.category || 'Strength'}
                        </span>
                        <span className="bg-white/5 text-gray-400 px-1.5 py-0.5 rounded-md capitalize">
                          {ex.difficulty || 'Intermediate'}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                      <span className="text-[10px] text-gray-500 truncate max-w-[90px] capitalize">{ex.equipment}</span>
                      <button className="p-1 rounded-lg bg-white/5 hover:bg-blue-600 text-gray-400 hover:text-white transition-colors">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Pagination Bar */}
          <div className="bg-[#111A23] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <span className="text-gray-400">
              Showing {exercises.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} exercises
            </span>

            <div className="flex items-center gap-1 font-bold">
              <button 
                disabled={page <= 1}
                onClick={() => setPage((p: number) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <span className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold">
                Page {page} of {totalPages}
              </span>

              <button 
                disabled={page >= totalPages}
                onClick={() => setPage((p: number) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* ── RIGHT 4 COLUMNS: EXERCISE DETAILS PANEL ── */}
        <div className="lg:col-span-4 space-y-6">
          
          {selectedExercise ? (
            <div className="bg-[#111A23] border border-white/10 rounded-2xl p-5 space-y-5">
              
              <ExerciseMediaManager
                exerciseId={selectedExercise.id}
                exerciseName={selectedExercise.name}
                media={selectedMedia}
                loading={loadingDetails}
                canManage={canManageMedia}
                onChanged={loadExerciseSubDetails}
              />

              {/* Exercise Title & Source Badge */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-black text-white">{selectedExercise.name}</h2>
                </div>
                
                <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
                  {selectedExercise.source_type === 'yeti_first_party' && (
                    <span className="text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-md">
                      Yeti First-Party
                    </span>
                  )}
                  <span className="text-gray-400 bg-white/5 px-2 py-0.5 rounded-md capitalize">
                    {selectedExercise.category}
                  </span>
                  <span className="text-gray-400 bg-white/5 px-2 py-0.5 rounded-md capitalize">
                    {selectedExercise.difficulty || 'Intermediate'}
                  </span>
                </div>

                {selectedAliases.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    <span className="font-bold text-gray-500">Aliases: </span>
                    {selectedAliases.map((a: ExerciseAlias) => a.alias).join(', ')}
                  </p>
                )}
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-4 border-b border-white/10 pb-2 text-xs font-bold">
                <button
                  onClick={() => setDetailTab('overview')}
                  className={`pb-1 transition-colors ${
                    detailTab === 'overview' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setDetailTab('instructions')}
                  className={`pb-1 transition-colors ${
                    detailTab === 'instructions' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Instructions
                </button>
                <button
                  onClick={() => setDetailTab('muscles')}
                  className={`pb-1 transition-colors ${
                    detailTab === 'muscles' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Muscles
                </button>
              </div>

              {/* TAB 1: OVERVIEW */}
              {detailTab === 'overview' && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-2.5 bg-[#161C28] p-3.5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Primary Muscle
                      </span>
                      <span className="font-bold text-white capitalize">{selectedExercise.primary_muscle}</span>
                    </div>

                    {selectedExercise.secondary_muscles && selectedExercise.secondary_muscles.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Secondary Muscles
                        </span>
                        <span className="font-bold text-white capitalize">
                          {selectedExercise.secondary_muscles.join(', ')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Equipment</span>
                      <span className="font-bold text-white capitalize">{selectedExercise.equipment}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Movement Pattern</span>
                      <span className="font-bold text-white capitalize">{selectedExercise.movement_pattern || 'Standard'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Default Sets / Reps</span>
                      <span className="font-bold text-white">
                        {selectedExercise.default_sets || 3} sets × {getExercisePrescriptionDisplay(selectedExercise) || 'Not specified'}
                      </span>
                    </div>

                    {selectedExercise.recommended_rest_seconds && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Recommended Rest</span>
                        <span className="font-bold text-white">{selectedExercise.recommended_rest_seconds} seconds</span>
                      </div>
                    )}

                    {selectedExercise.hypertrophy_reps && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Hypertrophy Range</span>
                        <span className="font-bold text-blue-400">{selectedExercise.hypertrophy_reps} reps</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: INSTRUCTIONS */}
              {detailTab === 'instructions' && (
                <div className="space-y-4 text-xs">
                  {selectedExercise.setup_instructions && (
                    <div className="space-y-1">
                      <p className="font-bold text-blue-400">Setup Instructions</p>
                      <p className="text-gray-300 leading-relaxed bg-[#161C28] p-3 rounded-xl border border-white/5">
                        {selectedExercise.setup_instructions}
                      </p>
                    </div>
                  )}

                  {selectedExercise.execution_instructions && (
                    <div className="space-y-1">
                      <p className="font-bold text-emerald-400">Execution Instructions</p>
                      <p className="text-gray-300 leading-relaxed bg-[#161C28] p-3 rounded-xl border border-white/5">
                        {selectedExercise.execution_instructions}
                      </p>
                    </div>
                  )}

                  {selectedExercise.breathing && (
                    <div className="space-y-1">
                      <p className="font-bold text-amber-400">Breathing Cue</p>
                      <p className="text-gray-300 leading-relaxed bg-[#161C28] p-3 rounded-xl border border-white/5">
                        {selectedExercise.breathing}
                      </p>
                    </div>
                  )}

                  {selectedExercise.coaching_cues && selectedExercise.coaching_cues.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-bold text-purple-400">Coaching Cues</p>
                      <ul className="list-disc list-inside text-gray-300 bg-[#161C28] p-3 rounded-xl border border-white/5 space-y-1">
                        {selectedExercise.coaching_cues.map((cue: string, idx: number) => (
                          <li key={idx}>{cue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedExercise.safety_notes && (
                    <div className="space-y-1">
                      <p className="font-bold text-rose-400">Safety Notes</p>
                      <p className="text-gray-300 leading-relaxed bg-[#161C28] p-3 rounded-xl border border-rose-500/20">
                        {selectedExercise.safety_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MUSCLES */}
              {detailTab === 'muscles' && (
                <div className="space-y-3 text-xs">
                  <div className="bg-[#161C28] border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Primary Muscle</p>
                    <p className="font-bold text-blue-400 text-sm capitalize">{selectedExercise.primary_muscle}</p>
                    {selectedExercise.target_muscle && (
                      <p className="text-gray-400 text-[11px] mt-0.5">Target: {selectedExercise.target_muscle}</p>
                    )}
                  </div>

                  {selectedMuscles.length > 0 && (
                    <div className="bg-[#161C28] border border-white/5 rounded-xl p-4 space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Muscle Roles Breakdown</p>
                      {selectedMuscles.map((m: ExerciseMuscle) => (
                        <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                          <span className="text-white capitalize">{m.muscle}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                            m.role === 'primary' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400'
                          }`}>
                            {m.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button 
                  onClick={() => router.push('/plans/builder')}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add to Workout Plan</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-[#111A23] border border-white/10 rounded-2xl p-8 text-center text-gray-400">
              <p className="text-xs">Select an exercise from the grid to view details and instructions.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
