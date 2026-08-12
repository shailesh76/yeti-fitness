"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCoachStore, Exercise, PlanDay, AssignedExercise } from "@/store/useCoachStore";
import { createSaveGuard, createPlanLoadTracker, canPersistPlan, persistBlockedReason, didRouteChange } from "@/lib/planBuilderGuards";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Search, Plus, Trash2, GripVertical, X } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- Sub-components for DnD ---

function DraggableExercise({ 
  exercise, 
  previousWeight, 
  onAdd 
}: { 
  exercise: Exercise; 
  previousWeight?: number;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${exercise.id}`,
    data: { type: "library", exercise },
  });
  
  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg bg-surface-highlight border border-white/5 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors flex items-center justify-between gap-3 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <div className="font-bold text-white text-sm truncate">{exercise.name}</div>
          {previousWeight !== undefined && (
            <div className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
              Prev: {previousWeight}kg
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{exercise.muscleGroup}</div>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="p-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-md transition-colors shrink-0 flex items-center justify-center"
        title="Add to active day"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function DraggableBundle({ bundle, onAdd }: { bundle: any; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bundle-${bundle.id}`,
    data: { type: "bundle", bundle },
  });
  
  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg bg-surface-highlight border border-white/5 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors flex items-center justify-between gap-3 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-sm truncate">{bundle.name}</div>
        <div className="text-xs text-gray-500 font-semibold mt-0.5">{bundle.bundle_exercises?.length || 0} exercises</div>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="p-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-md transition-colors shrink-0 flex items-center justify-center"
        title="Add bundle to active day"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function SortableExerciseItem({
  item,
  previousWeight,
  onRemove,
  onUpdate,
}: {
  item: AssignedExercise;
  previousWeight?: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: "sets" | "reps" | "weight", value: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: { type: "assigned", item } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg bg-surface border border-white/10 ${
        isDragging ? "opacity-50 border-primary/50" : ""
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab text-gray-500 hover:text-white">
        <GripVertical className="h-5 w-5" />
      </div>
      
      <div className="flex-1">
        <div className="font-bold text-white text-sm mb-2">{item.name}</div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-bold uppercase">Sets</span>
            {/* A persisted NULL renders as an empty field with a placeholder,
                never as an invented "3" that a later save would write back. */}
            <input
              type="text"
              value={item.sets ?? ""}
              placeholder="—"
              onChange={(e) => onUpdate(item.id, "sets", e.target.value)}
              className="w-12 h-7 bg-white/5 border border-white/10 rounded px-2 text-sm text-white text-center focus:outline-none focus:border-primary placeholder:text-gray-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-bold uppercase">Reps</span>
            <input
              type="text"
              value={item.reps ?? ""}
              placeholder="—"
              onChange={(e) => onUpdate(item.id, "reps", e.target.value)}
              className="w-16 h-7 bg-white/5 border border-white/10 rounded px-2 text-sm text-white text-center focus:outline-none focus:border-primary placeholder:text-gray-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-bold uppercase">Weight</span>
            <input
              type="text"
              value={item.weight || ""}
              onChange={(e) => onUpdate(item.id, "weight", e.target.value)}
              placeholder="e.g. 50kg"
              className="w-20 h-7 bg-white/5 border border-white/10 rounded px-2 text-sm text-white text-center focus:outline-none focus:border-primary placeholder:text-gray-650"
            />
          </div>
          {previousWeight !== undefined && (
            <div className="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
              Prev: {previousWeight} kg
            </div>
          )}
        </div>
      </div>

      <button onClick={() => onRemove(item.id)} className="text-gray-500 hover:text-red-500 p-2">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DropZone({ dayId, exercises, previousWeights, onRemove, onUpdate }: { 
  dayId: string; 
  exercises: AssignedExercise[];
  previousWeights: Record<string, number>;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: "sets" | "reps" | "weight", value: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `dropzone-${dayId}` });
 
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 rounded-xl p-4 border-2 border-dashed transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-white/10 bg-surface-highlight/30"
      }`}
    >
      <SortableContext items={exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {exercises.length === 0 && !isOver && (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm font-semibold">
              Drag exercises here
            </div>
          )}
          {exercises.map((item) => (
            <SortableExerciseItem
              key={item.id}
              item={item}
              previousWeight={previousWeights[item.exerciseId]}
              onRemove={onRemove}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// --- Main Page ---

function PlanBuilderInner() {
  const { 
    exercises, 
    getExercises, 
    clients, 
    getClients, 
    savePlan,
    getPlanForEdit,
    assignExistingPlan,
    bundles,
    getBundles,
    createBundle,
    deleteBundle,
    previousWeights,
    fetchPreviousWeights
  } = useCoachStore();
  const [search, setSearch] = useState("");
  const [planName, setPlanName] = useState("New Hypertrophy Plan");
  const [activeView, setActiveView] = useState<'library' | 'builder'>('builder');

  const handleAddExercise = (exercise: Exercise) => {
    const newItem: AssignedExercise = {
      id: `assigned-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      exerciseId: exercise.id,
      name: exercise.name,
      sets: "3",
      reps: "10",
      weight: previousWeights[exercise.id] ? `${previousWeights[exercise.id]}` : "",
    };
    
    setDays(prev => prev.map(day => {
      if (day.id === activeDayId) {
        return { ...day, exercises: [...day.exercises, newItem] };
      }
      return day;
    }));
  };

  const handleAddBundle = (bundle: any) => {
    const newItems = (bundle.bundle_exercises || []).map((bex: any, idx: number) => ({
      id: `assigned-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 9)}`,
      exerciseId: bex.exercise_id,
      name: bex.exercise?.name || 'Exercise',
      sets: bex.sets.toString(),
      reps: bex.reps.toString(),
      weight: bex.weight?.toString() || "",
    }));

    setDays(prev => prev.map(day => {
      if (day.id === activeDayId) {
        return { ...day, exercises: [...day.exercises, ...newItems] };
      }
      return day;
    }));
  };
  
  const [days, setDays] = useState<PlanDay[]>([
    { id: "day-1", name: "Day 1", exercises: [] }
  ]);
  const [activeDayId, setActiveDayId] = useState("day-1");
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [assignSearch, setAssignSearch] = useState("");

  // Bundles States
  const [libraryTab, setLibraryTab] = useState<'exercises' | 'bundles'>('exercises');
  const [showCreateBundleModal, setShowCreateBundleModal] = useState(false);
  const [newBundleName, setNewBundleName] = useState("");
  const [bundleDraftExercises, setBundleDraftExercises] = useState<any[]>([]);
  const [bundleSubmitting, setBundleSubmitting] = useState(false);

  const searchParams = useSearchParams();
  const queryClientId = searchParams?.get("clientId");
  const queryPlanId = searchParams?.get("planId");
  const firstClientId = Array.from(selectedClients)[0];

  // ── Phase 3: real persistence state ──────────────────────────────────────
  const [planId, setPlanId] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planLoadError, setPlanLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Synchronous single-flight guard. React state is batched, so `saving` cannot
  // stop two clicks in the same tick — without this, two concurrent handlers
  // could both reach savePlan() and create two distinct plans before Phase 2's
  // assignExistingPlan guard (which is keyed by plan id) could ever apply.
  const saveGuardRef = useRef(createSaveGuard());

  // Previous value of the route's ?planId=. `undefined` means "not evaluated
  // yet" (first mount), which is distinct from `null` ("route has no planId").
  const prevQueryPlanIdRef = useRef<string | null | undefined>(undefined);

  // Load lifecycle, tracked separately from route identity. Route identity
  // alone cannot answer "does this route still need loading?" — under Strict
  // Mode the same route must load twice, because the first request is killed
  // by the cleanup between the two setups.
  const loadTrackerRef = useRef(createPlanLoadTracker());

  const editState = {
    queryPlanId: queryPlanId ?? null,
    loadedPlanId: planId,
    loadFailed: planLoadError !== null,
    loading: planLoading,
  };
  const persistAllowed = canPersistPlan(editState);
  const blockedReason = persistBlockedReason(editState);

  useEffect(() => {
    getExercises();
    getClients();
    getBundles();
  }, []);

  // Edit mode: ?planId=<uuid> loads one of THIS coach's plans. getPlanForEdit
  // filters on coach_id, so another coach's id simply resolves to not_found and
  // nothing is hydrated into the builder.
  useEffect(() => {
    const currentQueryPlanId = queryPlanId ?? null;
    const tracker = loadTrackerRef.current;

    // Compare against the PREVIOUS ROUTE, never against the loaded planId.
    // savePlan() returns a canonical id that we store in planId; that is
    // persistence state, not navigation, and must never be read as a route
    // transition — doing so cleared the id right after a create and made the
    // next Save mint a second plan.
    const routeChanged = didRouteChange(prevQueryPlanIdRef.current, currentQueryPlanId);
    prevQueryPlanIdRef.current = currentQueryPlanId;

    if (routeChanged) {
      // Navigating edit -> plain create keeps this component mounted, so the
      // old canonical planId has to be dropped here; otherwise the next Save
      // would update the previous plan instead of creating a new one.
      setPlanId(null);
      setPlanLoadError(null);
      // planLoading belongs to the ROUTE, not to a request. Leaving an
      // in-flight edit for /plans/builder cancels that request, and a
      // cancelled request is (correctly) unable to clear anything — so
      // without this reset the create route stayed disabled forever, waiting
      // on a load that could never report back. Reset because the route
      // changed, never because a stale request finished.
      setPlanLoading(false);
      // Whatever the previous route completed says nothing about this one.
      tracker.forget();
    }

    if (!currentQueryPlanId) return;

    // Route identity is not the load gate — the tracker is. An unchanged route
    // still loads when the previous attempt never completed (Strict Mode's
    // cleanup between the two setups cancels it), and a completed route never
    // reloads on an ordinary re-render.
    const token = tracker.claim(currentQueryPlanId);
    if (token === null) return;

    const targetPlanId = currentQueryPlanId;
    let cancelled = false;
    const isStale = () => cancelled || !tracker.isLive(token);
    (async () => {
      setPlanLoading(true);
      try {
        const res = await getPlanForEdit(targetPlanId);
        if (isStale()) return;
        if (res.status === "ok" && res.plan) {
          setPlanId(res.plan.id);
          setPlanName(res.plan.name);
          if (res.plan.days.length > 0) {
            setDays(res.plan.days);
            setActiveDayId(res.plan.days[0].id);
          }
        } else {
          setPlanLoadError(
            res.status === "not_found"
              ? "That plan was not found on your account."
              : res.status === "unauthenticated"
                ? "Your session has expired. Sign in again."
                : res.message || "Couldn't load that plan.",
          );
        }
        // Completed (hydrated or errored): this route is done, so a re-render
        // must not refetch it — and an error must not retry forever.
        tracker.settle(token);
        setPlanLoading(false);
      } catch (e: any) {
        if (isStale()) return;
        setPlanLoadError(e?.message || "Couldn't load that plan.");
        tracker.settle(token);
        setPlanLoading(false);
      }
    })();
    // Releasing the claim is what makes the same route eligible again: the
    // cancelled request can no longer hydrate or clear planLoading, so the
    // next setup has to be able to start a fresh one.
    return () => {
      cancelled = true;
      tracker.release(token);
    };
    // Deliberately NOT dependent on planId: this effect responds to route
    // changes only. The tracker makes it idempotent if it ever re-runs for
    // another reason, so an ordinary re-render never reloads or clears the draft.
  }, [queryPlanId, getPlanForEdit]);

  /** Persists the plan without assigning it. Returns the canonical plan id. */
  const persistPlan = async (): Promise<string | null> => {
    // A failed ?planId= load must never fall through into CREATE mode.
    if (!persistAllowed) {
      setSaveMessage({ text: blockedReason || "Saving is unavailable right now.", isError: true });
      return null;
    }
    // Claimed synchronously, before the first await.
    if (!saveGuardRef.current.tryAcquire()) return null;

    setSaving(true);
    setSaveMessage(null);
    try {
      const savedId = await savePlan({ name: planName, days }, planId ?? undefined);
      setPlanId(savedId);
      setSaveMessage({ text: planId ? "Plan updated." : "Plan saved.", isError: false });
      return savedId;
    } catch (e: any) {
      setSaveMessage({ text: e?.message || "Failed to save the plan.", isError: true });
      return null;
    } finally {
      saveGuardRef.current.release();
      setSaving(false);
    }
  };

  useEffect(() => {
    if (queryClientId) {
      setSelectedClients(new Set([queryClientId]));
    }
  }, [queryClientId]);

  useEffect(() => {
    if (firstClientId) {
      fetchPreviousWeights(firstClientId);
    }
  }, [firstClientId]);

  const handleAddExerciseToBundle = (exercise: Exercise) => {
    setBundleDraftExercises(prev => [
      ...prev,
      {
        exercise_id: exercise.id,
        name: exercise.name,
        sets: 3,
        reps: "10",
        weight: ""
      }
    ]);
  };

  const handleUpdateBundleDraftExercise = (index: number, field: 'sets' | 'reps' | 'weight', value: any) => {
    setBundleDraftExercises(prev => prev.map((ex, idx) => 
      idx === index ? { ...ex, [field]: value } : ex
    ));
  };

  const handleRemoveFromBundleDraft = (index: number) => {
    setBundleDraftExercises(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveBundle = async () => {
    if (!newBundleName || bundleDraftExercises.length === 0) return;
    setBundleSubmitting(true);
    try {
      await createBundle(newBundleName, bundleDraftExercises);
      setNewBundleName("");
      setBundleDraftExercises([]);
      setShowCreateBundleModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create bundle. Please try again.");
    } finally {
      setBundleSubmitting(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;

    if (!over) return;

    const activeType = active.data.current?.type;
    
    if (activeType === "library" || activeType === "bundle") {
      const dropzoneId = over.id.toString();
      let targetDayId = "";

      if (dropzoneId.startsWith("dropzone-")) {
        targetDayId = dropzoneId.replace("dropzone-", "");
      } else {
        const overItem = over.data.current?.item as AssignedExercise;
        if (overItem) {
          targetDayId = days.find(d => d.exercises.some(e => e.id === overItem.id))?.id || "";
        }
      }

      if (targetDayId) {
        if (activeType === "library") {
          const exercise = active.data.current?.exercise as Exercise;
          const newItem: AssignedExercise = {
            id: `assigned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            exerciseId: exercise.id,
            name: exercise.name,
            sets: "3",
            reps: "10",
            weight: previousWeights[exercise.id] ? `${previousWeights[exercise.id]}` : "",
          };
          
          setDays(prev => prev.map(day => {
            if (day.id === targetDayId) {
              return { ...day, exercises: [...day.exercises, newItem] };
            }
            return day;
          }));
        } else if (activeType === "bundle") {
          const bundle = active.data.current?.bundle;
          const newItems = (bundle.bundle_exercises || []).map((bex: any, idx: number) => ({
            id: `assigned-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
            exerciseId: bex.exercise_id,
            name: bex.exercise?.name || 'Exercise',
            sets: bex.sets.toString(),
            reps: bex.reps.toString(),
            weight: bex.weight?.toString() || "",
          }));

          setDays(prev => prev.map(day => {
            if (day.id === targetDayId) {
              return { ...day, exercises: [...day.exercises, ...newItems] };
            }
            return day;
          }));
        }
      }
      return;
    }

    if (activeType === "assigned" && active.id !== over.id) {
      const activeItem = active.data.current?.item as AssignedExercise;
      const overItem = over.data.current?.item as AssignedExercise;
      
      setDays(prev => prev.map(day => {
        const oldIndex = day.exercises.findIndex(e => e.id === activeItem.id);
        const newIndex = day.exercises.findIndex(e => e.id === overItem?.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return { ...day, exercises: arrayMove(day.exercises, oldIndex, newIndex) };
        }
        return day;
      }));
    }
  };

  const removeExercise = (dayId: string, exerciseId: string) => {
    setDays(prev => prev.map(day => 
      day.id === dayId 
        ? { ...day, exercises: day.exercises.filter(e => e.id !== exerciseId) }
        : day
    ));
  };

  const updateExercise = (dayId: string, exerciseId: string, field: "sets" | "reps" | "weight", value: string) => {
    setDays(prev => prev.map(day => {
      if (day.id !== dayId) return day;
      return { ...day, exercises: day.exercises.map(e => e.id === exerciseId ? { ...e, [field]: value } : e) };
    }));
  };

  const filteredLibrary = exercises.filter(e => 
    (e.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (e.muscleGroup || '').toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredBundles = bundles.filter(b => 
    (b.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeDay = days.find(d => d.id === activeDayId);

  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const handleAssignSubmit = async () => {
    if (selectedClients.size === 0 || assignSubmitting) return;
    setAssignSubmitting(true);
    setSaveMessage(null);
    try {
      // Phase 3: save first to obtain the canonical plan id, then assign through
      // the Phase 2 path. assignExistingPlan re-verifies athlete linkage AND plan
      // ownership, is RLS-hardened, guards duplicate submissions and reports the
      // notification outcome honestly — assignPlan (create-and-assign) does none
      // of that and would create a fresh duplicate plan on every assignment.
      const savedId = await persistPlan();
      if (!savedId) return; // persistPlan already surfaced the error

      const outcomes = [];
      for (const athleteId of Array.from(selectedClients)) {
        outcomes.push(await assignExistingPlan(savedId, athleteId));
      }

      const assigned = outcomes.filter((o) => !o.duplicateSuppressed).length;
      const unnotified = outcomes.filter((o) => !o.duplicateSuppressed && !o.notified).length;
      setSaveMessage(
        unnotified > 0
          ? {
              text: `Plan saved and assigned to ${assigned} athlete${assigned === 1 ? "" : "s"}, but ${unnotified} could not be notified. Let them know directly.`,
              isError: true,
            }
          : {
              text: `Plan saved and assigned to ${assigned} athlete${assigned === 1 ? "" : "s"}.`,
              isError: false,
            },
      );
      setShowAssignModal(false);
      setSelectedClients(new Set());
    } catch (err: any) {
      setSaveMessage({ text: err?.message || "Failed to assign plan. Please try again.", isError: true });
    } finally {
      setAssignSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Mobile View Toggle Bar */}
        <div className="md:hidden flex border-b border-white/5 bg-[#181818] p-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveView('library')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors text-center ${
              activeView === 'library' ? 'bg-primary text-black' : 'bg-surface-highlight text-gray-400'
            }`}
          >
            Library
          </button>
          <button
            onClick={() => setActiveView('builder')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors text-center ${
              activeView === 'builder' ? 'bg-primary text-black' : 'bg-surface-highlight text-gray-400'
            }`}
          >
            Builder
          </button>
        </div>

        {/* Left Panel: Library */}
        <div className={`w-full md:w-80 border-r border-white/5 bg-[#131313] flex-col h-full shrink-0 ${activeView === 'library' ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-bold tracking-tight text-white mb-4">Library</h2>
            
            <div className="flex bg-[#181818] p-1 rounded-lg mb-4 border border-white/5">
              <button 
                onClick={() => { setLibraryTab('exercises'); setSearch(''); }}
                className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
                  libraryTab === 'exercises' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                Exercises
              </button>
              <button 
                onClick={() => { setLibraryTab('bundles'); setSearch(''); }}
                className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
                  libraryTab === 'bundles' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                Bundles
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder={libraryTab === 'exercises' ? "Search exercises..." : "Search bundles..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-md bg-surface border border-white/10 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {libraryTab === 'exercises' ? (
              filteredLibrary.map(exercise => (
                <DraggableExercise 
                  key={exercise.id} 
                  exercise={exercise} 
                  previousWeight={previousWeights[exercise.id]}
                  onAdd={() => handleAddExercise(exercise)}
                />
              ))
            ) : (
              <>
                <button 
                  onClick={() => setShowCreateBundleModal(true)}
                  className="w-full py-3 rounded-lg border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center text-xs font-bold uppercase tracking-wider mb-3"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Create Bundle
                </button>
                {filteredBundles.map(bundle => (
                  <div key={bundle.id} className="relative group">
                    <DraggableBundle bundle={bundle} onAdd={() => handleAddBundle(bundle)} />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete bundle "${bundle.name}"?`)) {
                          deleteBundle(bundle.id);
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-[#131313] rounded-md border border-white/5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Panel: Builder */}
        <div className={`flex-1 flex flex-col h-full bg-[#131313] ${activeView === 'builder' ? 'flex' : 'hidden md:flex'}`}>
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="text-2xl sm:text-3xl font-black tracking-tight text-white bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-gray-600 w-full sm:w-auto"
              placeholder="Plan Name"
            />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="secondary"
                onClick={persistPlan}
                disabled={saving || planLoading || !persistAllowed}
                className="flex-1 sm:flex-none"
              >
                {saving ? "Saving…" : planId ? "Save Changes" : "Save Plan"}
              </Button>
              <Button
                onClick={() => setShowAssignModal(true)}
                disabled={saving || planLoading || !persistAllowed}
                className="flex-1 sm:flex-none"
              >
                Save &amp; Assign
              </Button>
            </div>
          </div>

          {/* Phase 3: honest load/save state for real persistence */}
          {(planLoading || planLoadError || saveMessage) && (
            <div className="px-6 pt-3 shrink-0">
              {planLoading && (
                <p className="text-xs font-bold text-gray-400">Loading plan…</p>
              )}
              {planLoadError && (
                <p className="text-xs font-bold text-red-400">{planLoadError}</p>
              )}
              {/* Saving is blocked while a named plan failed to load, so the
                  builder can never silently create a new plan instead. */}
              {!planLoading && !persistAllowed && blockedReason && (
                <p className="text-xs font-bold text-amber-400">{blockedReason}</p>
              )}
              {saveMessage && (
                <p className={`text-xs font-bold ${saveMessage.isError ? "text-red-400" : "text-primary"}`}>
                  {saveMessage.text}
                </p>
              )}
            </div>
          )}

          {/* Builder Canvas */}
          <div className="flex-1 p-4 sm:p-8 flex flex-col min-h-0">
            
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 shrink-0">
              {days.map((day, dayIndex) => (
                <button
                  key={day.id}
                  onClick={() => setActiveDayId(day.id)}
                  className={`px-6 py-2 rounded-full text-sm font-bold tracking-wider uppercase transition-colors shrink-0 ${
                    activeDayId === day.id 
                      ? "bg-primary text-black" 
                      : "bg-surface-highlight text-gray-400 hover:text-white"
                  }`}
                >
                  {/* Positional label for an unnamed day — display only, never
                      written back as the persisted plan_days.name. */}
                  {day.name ?? `Day ${dayIndex + 1}`}
                </button>
              ))}
              <button
                onClick={() => {
                  const newId = `day-${days.length + 1}`;
                  setDays([...days, { id: newId, name: `Day ${days.length + 1}`, exercises: [] }]);
                  setActiveDayId(newId);
                }}
                className="px-4 py-2 rounded-full border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 transition-colors flex items-center shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Day
              </button>
            </div>

            {/* Drop Zone */}
            {activeDay && (
              <DropZone 
                dayId={activeDay.id} 
                exercises={activeDay.exercises} 
                previousWeights={previousWeights}
                onRemove={(eid) => removeExercise(activeDay.id, eid)}
                onUpdate={(eid, field, val) => updateExercise(activeDay.id, eid, field, val)}
              />
            )}
          </div>
        </div>

        <DragOverlay>
          {activeDragItem?.type === "library" ? (
            <div className="p-3 rounded-lg bg-surface border-2 border-primary shadow-glow opacity-90">
              <div className="font-bold text-white text-sm">{activeDragItem.exercise.name}</div>
            </div>
          ) : null}
          {activeDragItem?.type === "bundle" ? (
            <div className="p-3 rounded-lg bg-surface border-2 border-primary shadow-glow opacity-90">
              <div className="font-bold text-white text-sm">{activeDragItem.bundle.name}</div>
            </div>
          ) : null}
          {activeDragItem?.type === "assigned" ? (
            <div className="p-3 rounded-lg bg-surface border-2 border-primary shadow-glow opacity-90">
              <div className="font-bold text-white text-sm">{activeDragItem.item.name}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-[#131313] border-white/10 p-0 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Assign to Clients</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  className="w-full h-10 rounded-md bg-surface border border-white/10 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {clients
                .filter(c => c.name.toLowerCase().includes(assignSearch.toLowerCase()))
                .map(client => (
                <label key={client.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={selectedClients.has(client.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedClients);
                      if (e.target.checked) newSet.add(client.id);
                      else newSet.delete(client.id);
                      setSelectedClients(newSet);
                    }}
                    className="h-5 w-5 rounded border-gray-600 text-primary focus:ring-primary bg-surface/50"
                  />
                  <Avatar initials={client.initials} colorClass={client.avatarColor} className="h-8 w-8 text-xs" />
                  <span className="text-sm font-bold text-white">{client.name}</span>
                </label>
              ))}
            </div>

            <div className="p-6 border-t border-white/5 bg-surface/50 rounded-b-2xl">
              <Button 
                onClick={handleAssignSubmit} 
                className="w-full" 
                disabled={selectedClients.size === 0 || assignSubmitting}
              >
                {assignSubmitting ? "Assigning..." : `Assign Plan (${selectedClients.size})`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create Bundle Modal */}
      {showCreateBundleModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#1c1b1b] border border-white/10 rounded-2xl w-full max-w-lg p-6 overflow-hidden flex flex-col max-h-[85vh] shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Create Exercise Bundle</h3>
              <button 
                onClick={() => {
                  setShowCreateBundleModal(false);
                  setNewBundleName("");
                  setBundleDraftExercises([]);
                }}
                className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Bundle Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Heavy Push Routine"
                  value={newBundleName}
                  onChange={(e) => setNewBundleName(e.target.value)}
                  className="w-full h-11 bg-[#131313] border border-white/10 rounded-lg px-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-gray-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Add Exercise</label>
                <select 
                  onChange={(e) => {
                    const ex = exercises.find(ex => ex.id === e.target.value);
                    if (ex) {
                      handleAddExerciseToBundle(ex);
                      e.target.value = "";
                    }
                  }}
                  className="w-full h-11 bg-[#131313] border border-white/10 rounded-lg px-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  <option value="">Select an exercise to add...</option>
                  {exercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscleGroup})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border-t border-white/5 pt-4 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Exercises in Bundle</h4>
              
              {bundleDraftExercises.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-8">No exercises added to this bundle yet.</p>
              ) : (
                <div className="space-y-2">
                  {bundleDraftExercises.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-[#131313]/50 border border-white/[0.03]">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-sm font-bold text-white truncate">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500 font-bold uppercase">Sets</span>
                          <input 
                            type="number"
                            value={item.sets}
                            onChange={(e) => handleUpdateBundleDraftExercise(index, 'sets', parseInt(e.target.value) || 3)}
                            className="w-10 h-7 bg-white/5 border border-white/10 rounded text-center text-xs text-white"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500 font-bold uppercase">Reps</span>
                          <input 
                            type="text"
                            value={item.reps}
                            onChange={(e) => handleUpdateBundleDraftExercise(index, 'reps', e.target.value)}
                            className="w-12 h-7 bg-white/5 border border-white/10 rounded text-center text-xs text-white"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500 font-bold uppercase">Weight</span>
                          <input 
                            type="text"
                            value={item.weight || ""}
                            onChange={(e) => handleUpdateBundleDraftExercise(index, 'weight', e.target.value)}
                            placeholder="kg"
                            className="w-12 h-7 bg-white/5 border border-white/10 rounded text-center text-xs text-white placeholder:text-gray-600"
                          />
                        </div>
                        <button 
                          onClick={() => handleRemoveFromBundleDraft(index)}
                          className="text-gray-500 hover:text-red-500 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={handleSaveBundle}
              disabled={bundleSubmitting || !newBundleName || bundleDraftExercises.length === 0}
              className="w-full h-11 bg-primary text-black font-black uppercase text-xs tracking-wider rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-colors"
            >
              {bundleSubmitting ? 'Creating Bundle...' : 'Create Bundle'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlanBuilderPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-white">Loading...</div>}>
      <PlanBuilderInner />
    </Suspense>
  );
}
