"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Search, SlidersHorizontal, Star, Plus, 
  Heart, Play, ChevronLeft, ChevronRight, Dumbbell, 
  Info, Check, Layers, User, Bookmark, Sparkles, Filter, RefreshCw, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ExerciseMediaManager } from '@/components/ExerciseMediaManager';
import {
  fetchAllExerciseMediaRows,
  fetchAllExerciseRows,
  matchesExerciseMediaFilter,
  type ExerciseMediaCompletenessFilter,
  type ExerciseMediaRecord
} from '@/lib/exerciseMedia';
import {
  evaluateExerciseQuality,
  getQualityStatusBadgeConfig,
  getQualityStatusLabel,
  fetchExerciseRelationCounts,
  matchesQualityFilter,
  type ExerciseQualityFilter,
  type ExerciseQualityStatus,
  type ExerciseRelationCounts,
} from '@/lib/exerciseQuality';
import { getExercisePrescriptionDisplay } from '../../../../packages/types/src/exercisePrescription';
import { buildExerciseFilterOptions, type ExerciseFilterOptions, type ExerciseFilterSourceRow } from '@/lib/exerciseCatalogFilters';

const EMPTY_TAXONOMY: ExerciseFilterOptions = { category: [], muscle: [], equipment: [], difficulty: [] };

function taxonomyLabel(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

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
  created_by_coach_id?: string | null;
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
  const [editorIdentity, setEditorIdentity] = useState<{ userId: string; role: string } | null>(null);
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
  const [qualityFilter, setQualityFilter] = useState<ExerciseQualityFilter>('all');
  const [sortBy, setSortBy] = useState('az');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [taxonomy, setTaxonomy] = useState<ExerciseFilterOptions>(EMPTY_TAXONOMY);
  const [taxonomyError, setTaxonomyError] = useState(false);
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [relationCountsMap, setRelationCountsMap] = useState<Map<string, ExerciseRelationCounts>>(new Map());
  const requestSequenceRef = React.useRef(0);

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
          .is('archived_at', null)
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
    async function loadAuthenticatedContext() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError || !user) {
        setAuthState('unauthenticated');
        setCanManageMedia(false);
        setEditorIdentity(null);
        router.replace('/login');
        return;
      }

      setAuthState('authenticated');
      const [{ data: profile, error: profileError }, filterOptionsResult] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        fetchAllExerciseRows<ExerciseFilterSourceRow>(async (from, to) => {
          const { data, count, error } = await supabase
            .from('exercises')
            .select('id, category, primary_muscle, target_muscle, equipment, difficulty', { count: 'exact' })
            .is('archived_at', null)
            .range(from, to);
          return { data: (data || []) as ExerciseFilterSourceRow[], count, error };
        }).then(({ rows }) => ({ options: buildExerciseFilterOptions(rows), error: null }))
          .catch((error: unknown) => ({ options: EMPTY_TAXONOMY, error })),
      ]);
      if (cancelled) return;

      if (!profileError && profile?.role) {
        setCanManageMedia(profile.role === 'coach' || profile.role === 'admin');
        setEditorIdentity({ userId: user.id, role: profile.role });
      } else {
        setCanManageMedia(false);
        setEditorIdentity(null);
      }

      if (filterOptionsResult.error) {
        setTaxonomyError(true);
      } else {
        setTaxonomy(filterOptionsResult.options);
        setTaxonomyError(false);
      }
    }
    void loadAuthenticatedContext();
    return () => { cancelled = true; };
  }, [router]);

  // Main Exercises Query Function
  const fetchExercises = useCallback(async () => {
    if (authState !== 'authenticated') return;
    const reqSeq = ++requestSequenceRef.current;
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
        .select(mediaStatusFilter === 'all' ? '*' : 'id', { count: 'exact' })
        .is('archived_at', null);

      // Apply Source Filter
      if (sourceFilter === 'yeti_first_party') {
        query = query.eq('source_type', 'yeti_first_party');
      } else if (sourceFilter === 'legacy_catalog') {
        query = query.eq('source_type', 'legacy_catalog');
      } else if (sourceFilter === 'custom') {
        query = query.eq('source_type', 'custom');
      }

      // Apply Category Filter
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);

      // Apply Equipment Filter
      if (equipmentFilter !== 'all') query = query.eq('equipment', equipmentFilter);

      // Apply Difficulty Filter
      if (difficultyFilter !== 'all') query = query.eq('difficulty', difficultyFilter);

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
      }

      if (muscleGroupFilter !== 'all') {
        query = query.or(`primary_muscle.ilike.%${muscleGroupFilter}%,target_muscle.ilike.%${muscleGroupFilter}%`);
      }

      // Apply Sorting
      if (sortBy === 'az') {
        query = query.order('name', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Completeness filtering must happen across the full matching result set before pagination.
      if (mediaStatusFilter === 'all' && qualityFilter === 'all') {
        const from = (page - 1) * pageSize;
        query = query.range(from, from + pageSize - 1);
      }

      let nextExercises: DbExercise[] = [];
      let nextTotalCount = 0;
      if (mediaStatusFilter === 'all' && qualityFilter === 'all') {
        const { data, count, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;
        nextExercises = (data || []) as DbExercise[];
        nextTotalCount = count || 0;
        const pageIds = nextExercises.map((exercise) => exercise.id);
        if (pageIds.length > 0) {
          const relCounts = await fetchExerciseRelationCounts(pageIds, supabase);
          setRelationCountsMap(relCounts);
        }
      } else {
        const completeSet = await fetchAllExerciseRows<{ id: string }>(async (from, to) => {
          const { data, count, error } = await query.range(from, to);
          return { data: (data || []) as Array<{ id: string }>, count, error };
        });
        const exerciseIds = completeSet.rows.map((exercise) => exercise.id);
        nextTotalCount = completeSet.count;
        const mediaByExercise = new Map<string, ExerciseMediaRecord[]>();
        let relCounts = new Map<string, ExerciseRelationCounts>();

        if (exerciseIds.length > 0) {
          const [mediaRows, fetchedRelCounts] = await Promise.all([
            fetchAllExerciseMediaRows(exerciseIds, async (idChunk, from, to) => {
              const { data, error } = await supabase
                .from('exercise_media')
                .select('id, exercise_id, media_type, file_format, url, r2_key, thumbnail_url, is_primary, media_status, media_notes, created_at')
                .in('exercise_id', idChunk)
                .order('id', { ascending: true })
                .range(from, to);
              return { data: (data || []) as ExerciseMediaRecord[], error };
            }),
            fetchExerciseRelationCounts(exerciseIds, supabase),
          ]);
          relCounts = fetchedRelCounts;
          for (const row of mediaRows) {
            const rows = mediaByExercise.get(row.exercise_id) ?? [];
            rows.push(row);
            mediaByExercise.set(row.exercise_id, rows);
          }
        }

        let filteredIds = exerciseIds;
        if (mediaStatusFilter !== 'all') {
          filteredIds = filteredIds.filter((exerciseId) =>
            matchesExerciseMediaFilter(mediaByExercise.get(exerciseId) ?? [], mediaStatusFilter as ExerciseMediaCompletenessFilter),
          );
        }

        if (qualityFilter !== 'all') {
          const candidateRecords: DbExercise[] = [];
          for (let i = 0; i < filteredIds.length; i += 150) {
            const chunk = filteredIds.slice(i, i + 150);
            const { data: cData } = await supabase.from('exercises').select('*').in('id', chunk);
            if (cData) candidateRecords.push(...(cData as DbExercise[]));
          }
          const candidateMap = new Map(candidateRecords.map((e) => [e.id, e]));
          filteredIds = filteredIds.filter((exerciseId) => {
            const ex = candidateMap.get(exerciseId);
            return ex ? matchesQualityFilter(ex, qualityFilter, relCounts.get(exerciseId)) : false;
          });
        }

        nextTotalCount = filteredIds.length;
        const from = (page - 1) * pageSize;
        const pageIds = filteredIds.slice(from, from + pageSize);
        if (pageIds.length > 0) {
          const { data: pageRows, error: pageError } = await supabase
            .from('exercises')
            .select('*')
            .in('id', pageIds);
          if (pageError) throw pageError;
          const rowsById = new Map(((pageRows || []) as DbExercise[]).map((row) => [row.id, row]));
          nextExercises = pageIds.map((id) => rowsById.get(id)).filter((row): row is DbExercise => Boolean(row));
          setRelationCountsMap(relCounts);
        }
      }

      if (reqSeq !== requestSequenceRef.current) return;

      setExercises(nextExercises);
      setTotalCount(nextTotalCount);

      // Functional state avoids closing over a selection from an earlier fetch.
      setSelectedExercise((current) =>
        nextExercises.length > 0 && current && nextExercises.some((exercise) => exercise.id === current.id)
          ? current
          : nextExercises[0] ?? null,
      );
    } catch (err: any) {
      if (reqSeq !== requestSequenceRef.current) return;
      console.error('Failed to fetch exercises:', err);
      setError(err.message || 'Failed to load exercise library.');
    } finally {
      if (reqSeq === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [
    authState, sourceFilter, categoryFilter, muscleGroupFilter, equipmentFilter,
    difficultyFilter, mediaStatusFilter, qualityFilter, debouncedSearch, sortBy, page
  ]);

  useEffect(() => {
    void fetchExercises();
  }, [fetchExercises]);

  // Load Sub-details (Aliases, Muscles, Media) for Selected Exercise
  const loadExerciseSubDetails = useCallback(async () => {
    if (!selectedExercise) return;
    setLoadingDetails(true);

    try {
      const [aliasRes, muscleRes, mediaRes] = await Promise.all([
        supabase.from('exercise_aliases').select('id, alias').eq('exercise_id', selectedExercise.id),
        supabase.from('exercise_muscles').select('id, muscle, role').eq('exercise_id', selectedExercise.id),
        supabase
          .from('exercise_media')
          .select('id, exercise_id, media_type, file_format, url, r2_key, thumbnail_url, is_primary, media_status, media_notes, created_at')
          .eq('exercise_id', selectedExercise.id),
      ]);

      if (aliasRes.data) setSelectedAliases(aliasRes.data);
      if (muscleRes.data) setSelectedMuscles(muscleRes.data);
      if (mediaRes.data) setSelectedMedia(mediaRes.data as ExerciseMediaRecord[]);
    } catch (err) {
      console.error('Failed to load sub details:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, [selectedExercise]);

  useEffect(() => {
    void loadExerciseSubDetails();
  }, [loadExerciseSubDetails]);

  // Favorite toggle helper
  const toggleFavorite = (exerciseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (authState === 'loading') {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="bg-[#111A23] border border-white/10 rounded-2xl p-12 text-center text-gray-400">
          <p className="text-xs">Checking authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* ── TOP HEADER SECTION ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white tracking-tight">Exercise Library</h1>
            <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/30">
              {totalCount.toLocaleString()} Exercises
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Browse and inspect Yeti-certified exercises with HD coaching videos and form cues.
          </p>
        </div>
      </div>

      {/* ── FILTER CONTROLS BAR ── */}
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
              setQualityFilter('all');
              setPage(1);
            }}
            className="flex items-center gap-2 bg-[#161C28] border border-white/10 hover:bg-white/5 text-gray-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shrink-0"
          >
            <Filter className="h-4 w-4" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Dropdown Selectors Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 text-xs">
          {/* Quality Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">Quality</label>
            <select
              value={qualityFilter}
              onChange={(e) => { setQualityFilter(e.target.value as any); setPage(1); }}
              className="w-full bg-[#161C28] border border-emerald-500/30 text-emerald-300 font-bold rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="all">All Quality</option>
              <option value="fully_published">Published</option>
              <option value="content_ready">Ready — Needs Media</option>
              <option value="needs_relations">Needs Relations</option>
              <option value="needs_content">Needs Content</option>
              <option value="needs_taxonomy">Needs Taxonomy</option>
              <option value="reference_only">Reference Only</option>
            </select>
          </div>

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
              {taxonomy.category.map((value) => (
                <option key={value} value={value}>{taxonomyLabel(value)}</option>
              ))}
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
              {taxonomy.muscle.map((value) => (
                <option key={value} value={value}>{taxonomyLabel(value)}</option>
              ))}
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
              {taxonomy.equipment.map((value) => (
                <option key={value} value={value}>{taxonomyLabel(value)}</option>
              ))}
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
              {taxonomy.difficulty.map((value) => (
                <option key={value} value={value}>{taxonomyLabel(value)}</option>
              ))}
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
          onClick={() => { setSourceFilter('yeti_first_party'); setQualityFilter('all'); setPage(1); }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            sourceFilter === 'yeti_first_party' && qualityFilter === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-[#111A23] text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-300" />
          <span>Yeti First-Party ({yetiCount})</span>
        </button>

        <button
          onClick={() => { setSourceFilter('all'); setQualityFilter('fully_published'); setPage(1); }}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            qualityFilter === 'fully_published' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-[#111A23] text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <Check className="h-3.5 w-3.5 text-emerald-300" />
          <span>Published</span>
        </button>

        <button
          onClick={() => { setSourceFilter('all'); setQualityFilter('content_ready'); setPage(1); }}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            qualityFilter === 'content_ready' ? 'bg-blue-600 text-white' : 'bg-[#111A23] text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <span>Ready — Needs Media</span>
        </button>

        <button
          onClick={() => { setSourceFilter('all'); setQualityFilter('needs_relations'); setPage(1); }}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            qualityFilter === 'needs_relations' ? 'bg-amber-600 text-white' : 'bg-[#111A23] text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <span>Needs Relations</span>
        </button>

        <button
          onClick={() => { setSourceFilter('all'); setQualityFilter('all'); setPage(1); }}
          className={`px-4 py-2 rounded-xl transition-colors ${
            sourceFilter === 'all' && qualityFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-[#111A23] text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          All Sources
        </button>

        <button
          onClick={() => { setSourceFilter('legacy_catalog'); setQualityFilter('all'); setPage(1); }}
          className={`px-4 py-2 rounded-xl transition-colors ${
            sourceFilter === 'legacy_catalog' && qualityFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-[#111A23] text-gray-400 hover:text-white border border-white/10'
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
                  setQualityFilter('all');
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
                const quality = evaluateExerciseQuality(ex, relationCountsMap.get(ex.id));
                const qualityBadge = getQualityStatusBadgeConfig(quality.status);

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

                        {/* Quality Badge on Media Card */}
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${qualityBadge.bgClass} ${qualityBadge.textClass} ${qualityBadge.borderClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${qualityBadge.dotColor}`} />
                          <span>{qualityBadge.label}</span>
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

                      {/* Compact Missing Indicators */}
                      {quality.status !== 'fully_published' && (quality.missingFields.length > 0 || quality.missingRelations.length > 0) && (
                        <p className="text-[9px] text-gray-500 mt-1.5 truncate">
                          <span className="text-gray-400 font-semibold">Missing:</span>{' '}
                          {[...quality.missingRelations, ...quality.missingFields]
                            .map((item) => item.replace(/^exercise_/, '').replace(/_/g, ' '))
                            .slice(0, 2)
                            .join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                      <span className="text-[10px] text-gray-500 truncate max-w-[90px] capitalize">{ex.equipment || 'No Equipment'}</span>
                      <span className="text-[10px] font-bold text-gray-400">Quality {quality.score}/100</span>
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

              {/* Quality Assessment Scorecard Banner */}
              {(() => {
                const quality = evaluateExerciseQuality(selectedExercise, relationCountsMap.get(selectedExercise.id));
                const badge = getQualityStatusBadgeConfig(quality.status);

                return (
                  <div className="bg-[#161C28] border border-white/10 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Catalog Quality</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 font-bold">Completeness Score</span>
                      <span className="text-sm font-black text-white">{quality.score} <span className="text-[10px] text-gray-500 font-normal">/ 100</span></span>
                    </div>

                    {/* Dimensions Pill Bar */}
                    <div className="grid grid-cols-3 gap-1.5 text-[9px] font-bold pt-1">
                      <div className={`p-1.5 rounded-lg text-center border ${quality.dimensions.taxonomy.complete ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                        Taxonomy {quality.dimensions.taxonomy.complete ? '✓' : `(${quality.dimensions.taxonomy.score}/25)`}
                      </div>
                      <div className={`p-1.5 rounded-lg text-center border ${quality.dimensions.coaching.complete ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                        Coaching {quality.dimensions.coaching.complete ? '✓' : `(${quality.dimensions.coaching.score}/35)`}
                      </div>
                      <div className={`p-1.5 rounded-lg text-center border ${quality.dimensions.requiredRelations.complete ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                        Relations {quality.dimensions.requiredRelations.complete ? '✓' : `(${quality.dimensions.requiredRelations.score}/15)`}
                      </div>
                    </div>

                    {/* Missing Fields Notice if any */}
                    {(quality.missingFields.length > 0 || quality.missingRelations.length > 0) && (
                      <div className="pt-2 border-t border-white/5">
                        <p className="text-[10px] font-bold text-amber-400 mb-1.5">Missing for Production Ready:</p>
                        <div className="flex flex-wrap gap-1">
                          {quality.missingFields.map((f) => (
                            <span key={f} className="text-[8px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                              {f}
                            </span>
                          ))}
                          {quality.missingRelations.map((r) => (
                            <span key={r} className="text-[8px] font-mono bg-rose-500/10 border border-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                {(editorIdentity?.role === 'admin'
                  || (editorIdentity?.role === 'coach'
                    && selectedExercise.source_type === 'custom'
                    && selectedExercise.created_by_coach_id === editorIdentity.userId)) && (
                  <button
                    type="button"
                    onClick={() => router.push(`/exercises/${selectedExercise.id}/edit`)}
                    className="w-full border border-white/10 bg-[#161C28] py-2.5 text-xs font-bold text-white hover:bg-white/5"
                  >
                    Edit exercise
                  </button>
                )}
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
