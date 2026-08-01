// Conversational workout-program requirements gathering. Pure module (Deno +
// vitest) — no DB access here; the edge fn supplies already-fetched profile/
// memory/plan data and this module deterministically merges + extracts.
//
// IMPORTANT schema note: profiles has NO experience_level / equipment /
// target_weight columns server-side (verified live — only goal, weight_kg,
// height_cm, age, gender, activity_level exist). Experience and equipment
// therefore come from Coach Memory ('workout style' / 'equipment preferences'
// categories, already supported by the memory system) and conversation text —
// never a nonexistent profile column.

export type ProgramGoal = 'muscle_gain' | 'strength' | 'fat_loss' | 'general_fitness' | 'athletic_performance';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentSetting = 'commercial_gym' | 'home_gym' | 'dumbbells_only' | 'bodyweight' | 'custom';

export interface ProgramRequirements {
  goal: ProgramGoal | null;
  experience: ExperienceLevel | null;
  daysPerWeek: number | null;
  preferredDays: string[];
  equipment: EquipmentSetting | null;
  customEquipment: string[];
  maxSessionMinutes: number | null;
  injuries: string[];
  likedExercises: string[];
  dislikedExercises: string[];
  priorityMuscleGroups: string[];
  recoveryConstraints: string[];
  requestedSplit: string | null; // explicit split mention, e.g. "push pull legs"
}

// The four fields a program genuinely cannot be built without — mirrors how a
// real trainer would refuse to write a program blind, but doesn't block on
// every softer preference (matching "ask only for missing information", not
// "interrogate before doing anything useful").
export const HARD_REQUIRED_FIELDS: (keyof ProgramRequirements)[] = ['goal', 'experience', 'daysPerWeek', 'equipment'];

const FIELD_QUESTION: Record<string, string> = {
  goal: 'what your main goal is right now — muscle gain, strength, fat loss, general fitness, or athletic performance',
  experience: 'how experienced you are with training — beginner, intermediate, or advanced',
  daysPerWeek: 'how many days a week you can train',
  equipment: "what equipment you'll be training with — a full gym, a home setup, dumbbells only, or bodyweight",
};

export function fieldQuestion(field: string): string {
  return FIELD_QUESTION[field] || field;
}

export function emptyRequirements(): ProgramRequirements {
  return {
    goal: null, experience: null, daysPerWeek: null, preferredDays: [],
    equipment: null, customEquipment: [], maxSessionMinutes: null,
    injuries: [], likedExercises: [], dislikedExercises: [], priorityMuscleGroups: [],
    recoveryConstraints: [], requestedSplit: null,
  };
}

/** Maps the app's coarse profile goal enum to the richer program-goal set. */
export function mapProfileGoal(goal: string | null | undefined): ProgramGoal | null {
  switch ((goal || '').toUpperCase()) {
    case 'BUILD_MUSCLE': return 'muscle_gain';
    case 'LOSE_FAT': return 'fat_loss';
    case 'MAINTAIN': return 'general_fitness';
    default: return null;
  }
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
};

/**
 * Deterministically extracts whatever program-relevant facts appear in a raw
 * message (regex-based — no LLM). Returns only what was actually found; never
 * guesses a value that wasn't stated.
 */
export function extractRequirementsFromText(text: string): Partial<ProgramRequirements> {
  const t = (text || '').toLowerCase();
  const out: Partial<ProgramRequirements> = {};

  // Goal
  //
  // Live-observed (runtime-hardening pass, 2026-08-01): a real athlete typed
  // "Building muscle." to answer the coach's own goal question, and it fell
  // through to no match at all — every verb below was written in only ONE
  // grammatical form (bare "build muscle", "lose fat", "improve my game",
  // "stay fit"), so the extremely common gerund reply ("building", "losing",
  // "improving", "staying") silently failed to resolve the goal, leaving the
  // athlete stuck re-answering a question they'd already answered. Each verb
  // now tolerates both its bare and "-ing" form.
  if (/\b(muscle gain|build(?:ing)? muscle|hypertrophy|bulk(?:ing)?|gain(?:ing)? size|get(?:ting)? bigger)\b/.test(t)) out.goal = 'muscle_gain';
  else if (/\b(strength|powerlifting|get(?:ting)? stronger|1rm|one rep max|max(?:imal)? strength)\b/.test(t)) out.goal = 'strength';
  else if (/\b(fat loss|los(?:e|ing) (?:fat|weight)|cutting|cut(?:\s|$)|lean(?:ing)? out|shred(?:ding)?)\b/.test(t)) out.goal = 'fat_loss';
  else if (/\b(athletic performance|sport(?:s)?[- ]specific|explosive(?:ness)?|speed and power|improv(?:e|ing) my (?:sport|game))\b/.test(t)) out.goal = 'athletic_performance';
  else if (/\b(general fitness|overall fitness|stay(?:ing)? (?:fit|healthy)|just (?:get(?:ting)?|stay(?:ing)?) fit)\b/.test(t)) out.goal = 'general_fitness';

  // Experience
  if (/\b(beginner|new to (lifting|training|the gym|weights)|never (lifted|trained)|just start(ed|ing) (out|lifting|training))\b/.test(t)) out.experience = 'beginner';
  else if (/\b(advanced|been (lifting|training) for (years|\d+\+? years)|competitive lifter|elite)\b/.test(t)) out.experience = 'advanced';
  else if (/\b(intermediate|(a|1|one) year(s)? (of )?(training|lifting)|some (lifting |training )?experience)\b/.test(t)) out.experience = 'intermediate';

  // Days per week — digits or spelled-out one..seven. The third alternative
  // catches a bare "N-day"/"N day" adjective directly on plan/program/split
  // words ("a 4-day PPL workout plan") — the first two alternatives both
  // require either a trailing "week" or a leading "train(ing)", neither of
  // which this common phrasing has.
  const digitMatch = t.match(/(\d+)\s*(?:days?|x)\s*(?:a|per|\/)?\s*week|train(?:ing)?\s*(\d+)\s*days?|\b(\d+)[\s-]day\b/);
  if (digitMatch) {
    const n = Number(digitMatch[1] || digitMatch[2] || digitMatch[3]);
    if (n >= 1 && n <= 7) out.daysPerWeek = n;
  } else {
    for (const [word, n] of Object.entries(WORD_NUMBERS)) {
      if (new RegExp(`\\b${word}\\s*(?:days?|times?)\\b.*\\bweek\\b|\\btrain(?:ing)?\\s*${word}\\s*days?\\b`).test(t)) {
        out.daysPerWeek = n;
        break;
      }
    }
  }

  // Preferred days
  const daysFound: string[] = [];
  if (/\bmon(day)?\b/.test(t)) daysFound.push('Monday');
  if (/\btue(sday)?\b/.test(t)) daysFound.push('Tuesday');
  if (/\bwed(nesday)?\b/.test(t)) daysFound.push('Wednesday');
  if (/\bthu(rsday)?\b/.test(t)) daysFound.push('Thursday');
  if (/\bfri(day)?\b/.test(t)) daysFound.push('Friday');
  if (/\bsat(urday)?\b/.test(t)) daysFound.push('Saturday');
  if (/\bsun(day)?\b/.test(t)) daysFound.push('Sunday');
  if (daysFound.length > 0) {
    out.preferredDays = daysFound;
    // A message that names specific days but never states a count ("I want to
    // train Monday, Tuesday, Thursday, Friday") unambiguously implies that
    // count — deriving it here avoids re-asking the athlete to restate a
    // number they already answered with a day list.
    if (out.daysPerWeek == null) out.daysPerWeek = daysFound.length;
  }

  // Equipment
  if (/\b(commercial gym|full gym|gym membership|globo gym|access to a gym)\b/.test(t)) out.equipment = 'commercial_gym';
  else if (/\bhome gym\b/.test(t)) out.equipment = 'home_gym';
  else if (/\b(dumbbells? only|just dumbbells|only (have |has )?dumbbells)\b/.test(t)) out.equipment = 'dumbbells_only';
  else if (/\b(bodyweight only|no equipment|calisthenics only|body[- ]?weight training)\b/.test(t)) out.equipment = 'bodyweight';

  // Max session duration
  const minMatch = t.match(/(\d+)\s*min(?:ute)?s?/);
  if (minMatch) out.maxSessionMinutes = Number(minMatch[1]);
  else if (/\b(an|1|one) hour\b/.test(t)) out.maxSessionMinutes = 60;
  else if (/half\s*(an|1|one)?\s*hour/.test(t)) out.maxSessionMinutes = 30;
  else if (/\b(90|ninety)\s*min|hour and a half|1\.5\s*hours?/.test(t)) out.maxSessionMinutes = 90;

  // Explicit split request
  if (/\bpush[\s-]?pull[\s-]?legs\b|\bppl\b/.test(t)) out.requestedSplit = 'Push/Pull/Legs';
  else if (/\bupper[\s-]?lower\b/.test(t)) out.requestedSplit = 'Upper/Lower';
  else if (/\bfull[\s-]?body\b/.test(t)) out.requestedSplit = 'Full Body';
  else if (/\bbro split\b/.test(t)) out.requestedSplit = 'Bro Split';

  // Injuries / Pain
  const injuries: string[] = [];
  if (/\bshoulder(s)?\s*(pain|injury|issue|tweak|hurt)?\b/.test(t) && /pain|injur|hurt|issue|tweak|bad/.test(t)) injuries.push('shoulder');
  if (/\bknee(s)?\s*(pain|injury|issue|tweak|hurt)?\b/.test(t) && /pain|injur|hurt|issue|tweak|bad/.test(t)) injuries.push('knee');
  if (/\b(lower\s*)?back\s*(pain|injury|issue|tweak|hurt)?\b/.test(t) && /pain|injur|hurt|issue|tweak|bad/.test(t)) injuries.push('back');
  if (/\bwrist(s)?\s*(pain|injury|issue|tweak|hurt)?\b/.test(t) && /pain|injur|hurt|issue|tweak|bad/.test(t)) injuries.push('wrist');
  if (/\belbow(s)?\s*(pain|injury|issue|tweak|hurt)?\b/.test(t) && /pain|injur|hurt|issue|tweak|bad/.test(t)) injuries.push('elbow');
  if (injuries.length > 0) out.injuries = injuries;

  // Disliked / excluded exercises
  const disliked: string[] = [];
  if (/\b(no|don't want|dislike|hate|exclude|avoid|without)\s+([a-z\s]+)\b/.test(t)) {
    const match = t.match(/\b(?:no|don't want|dislike|hate|exclude|avoid|without)\s+([a-z\s]+?)(?:[.,!]|$)/);
    if (match && match[1]) disliked.push(match[1].trim());
  }
  if (disliked.length > 0) out.dislikedExercises = disliked;

  // Liked exercises
  const liked: string[] = [];
  if (/\b(love|like|favourite|favorite|prefer|want)\s+([a-z\s]+)\b/.test(t)) {
    const match = t.match(/\b(?:love|like|favourite|favorite|prefer|want)\s+([a-z\s]+?)(?:[.,!]|$)/);
    if (match && match[1] && !/plan|program|split|days|gym|equipment/.test(match[1])) liked.push(match[1].trim());
  }
  if (liked.length > 0) out.likedExercises = liked;

  // Priority muscle groups
  const priority: string[] = [];
  if (/\b(focus on|priority|weak|build|grow)\s+(chest|back|shoulders?|arms?|biceps?|triceps?|legs?|quads?|hamstrings?|glutes?|abs?)\b/.test(t)) {
    const match = t.match(/\b(?:focus on|priority|weak|build|grow)\s+(chest|back|shoulders?|arms?|biceps?|triceps?|legs?|quads?|hamstrings?|glutes?|abs?)\b/);
    if (match && match[1]) priority.push(match[1].trim());
  }
  if (priority.length > 0) out.priorityMuscleGroups = priority;

  // Recovery constraints
  const recovery: string[] = [];
  if (/\b(poor sleep|bad sleep|not sleeping|shift work|night shifts|physical job|demanding work|fasting|other sports|play (basketball|soccer|football))\b/.test(t)) {
    const match = t.match(/\b(poor sleep|bad sleep|not sleeping|shift work|night shifts|physical job|demanding work|fasting|other sports|play [a-z]+)\b/);
    if (match && match[1]) recovery.push(match[1].trim());
  }
  if (recovery.length > 0) out.recoveryConstraints = recovery;

  return out;
}

/**
 * Merges known-source data in priority order: explicit mentions in the current
 * message > recent conversation > Coach Memory > profile-derived defaults >
 * current plan (day count only, as a weak default). Never invents a value —
 * every field stays null/empty unless a real source supplied it.
 */
export function resolveKnownRequirements(args: {
  latestMessage: string;
  recentMessages?: string[];      // older user turns, oldest-relevance last
  profileGoal?: string | null;
  memoryInjury?: string | null;
  memoryFavouriteExercises?: string[];
  memoryWeakMuscleGroups?: string[];
  memoryEquipment?: string | null;    // from ai_memory 'equipment preferences'
  memoryExperience?: string | null;   // from ai_memory 'workout style' / 'training goals'
  currentPlanDayCount?: number | null;
}): ProgramRequirements {
  const req = emptyRequirements();

  // Profile is the weakest signal — applied first so anything else overrides it.
  req.goal = mapProfileGoal(args.profileGoal);
  if (args.currentPlanDayCount) req.daysPerWeek = args.currentPlanDayCount;

  // Coach Memory next.
  if (args.memoryInjury) {
    const memInj = extractRequirementsFromText(args.memoryInjury).injuries;
    req.injuries = memInj && memInj.length > 0 ? memInj : [args.memoryInjury];
  }
  if (args.memoryFavouriteExercises?.length) req.likedExercises = [...args.memoryFavouriteExercises];
  if (args.memoryWeakMuscleGroups?.length) req.priorityMuscleGroups = [...args.memoryWeakMuscleGroups];

  const memEquip = extractRequirementsFromText(args.memoryEquipment || '').equipment;
  if (memEquip) req.equipment = memEquip;
  const memExp = extractRequirementsFromText(args.memoryExperience || '').experience;
  if (memExp) req.experience = memExp;

  // Older conversation turns (oldest signal wins less than newer, but still
  // fills anything the profile/memory didn't have).
  for (const msg of args.recentMessages || []) {
    const found = extractRequirementsFromText(msg);
    Object.assign(req, Object.fromEntries(Object.entries(found).filter(([, v]) => v != null)));
  }

  // The current message is authoritative — always wins.
  const latest = extractRequirementsFromText(args.latestMessage);
  Object.assign(req, Object.fromEntries(Object.entries(latest).filter(([, v]) => v != null)));

  return req;
}

/** Which hard-required fields are still unknown after resolution. */
export function findMissingRequired(req: ProgramRequirements): (keyof ProgramRequirements)[] {
  return HARD_REQUIRED_FIELDS.filter((f) => req[f] == null);
}

