// Deterministic training-split recommendation. Pure module (Deno + vitest).
// This is the "engine decides" half of program generation — the LLM only
// explains the recommendation below, it never chooses the split itself.
//
// The days->split mapping is a standard, defensible default (not spelled out
// in the originating spec, which covers required INPUTS but not this table) —
// documented plainly here so it can be reviewed/swapped without touching
// anything else in the pipeline.

import { ProgramGoal, ExperienceLevel } from './programRequirements.ts';

export interface SplitRecommendation {
  split: string;
  dayNames: string[];
  rationale: string;
  honoredRequest: boolean; // true if this matches what the athlete explicitly asked for
  adherenceCheckRequired?: boolean;
  adherenceNote?: string;
}

const FULL_BODY = (n: number) => Array.from({ length: n }, (_, i) => `Full Body ${i + 1}`);

function tableRecommendation(daysPerWeek: number, experience: ExperienceLevel): { split: string; dayNames: string[] } {
  const d = Math.min(Math.max(Math.round(daysPerWeek), 1), 6); // cap at 6 — a 7th day is a rest day, not a training day

  if (d <= 2) return { split: 'Full Body', dayNames: FULL_BODY(d) };
  if (d === 3) {
    return experience === 'beginner'
      ? { split: 'Full Body', dayNames: FULL_BODY(3) }
      : { split: 'Push/Pull/Legs', dayNames: ['Push', 'Pull', 'Legs'] };
  }
  if (d === 4) return { split: 'Upper/Lower', dayNames: ['Upper 1', 'Lower 1', 'Upper 2', 'Lower 2'] };
  if (d === 5) return { split: 'Push/Pull/Legs/Upper/Lower', dayNames: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'] };
  return { split: 'Push/Pull/Legs (x2)', dayNames: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'] };
}

const VALID_DAY_COUNTS_FOR_SPLIT: Record<string, number[]> = {
  'Full Body': [1, 2, 3],
  'Push/Pull/Legs': [3, 6],
  'Upper/Lower': [2, 4],
  'Bro Split': [5],
};

function reasonFor(split: string, daysPerWeek: number, experience: ExperienceLevel, goal: ProgramGoal | null): string {
  const goalText = goal ? goal.replace('_', ' ') : 'your goals';
  switch (split) {
    case 'Full Body':
      return `With ${daysPerWeek} day${daysPerWeek === 1 ? '' : 's'} a week, hitting every muscle group each session keeps frequency high, which suits ${experience === 'beginner' ? 'a beginner building a base' : goalText}.`;
    case 'Push/Pull/Legs':
      return `Push/Pull/Legs groups muscles by movement pattern, giving each one real recovery time between sessions — a good fit for ${experience} training at ${daysPerWeek} days a week aiming for ${goalText}.`;
    case 'Push/Pull/Legs/Upper/Lower':
      return `At 5 days, alternating PPL with an Upper/Lower pass gives every muscle group two touches a week without over-scheduling any single day.`;
    case 'Push/Pull/Legs (x2)':
      return `At 6 days, running Push/Pull/Legs twice through the week hits every muscle group twice, which drives more volume for ${goalText}.`;
    case 'Upper/Lower':
      return `Upper/Lower at ${daysPerWeek} days balances enough per-muscle volume with real recovery — a solid, sustainable structure for ${goalText}.`;
    default:
      return `This split fits your ${daysPerWeek}-day availability and ${experience} experience.`;
  }
}

/**
 * Recommends a split. If the athlete explicitly requested one, it's honored
 * when it actually fits their days/week; otherwise the deterministic table
 * decides and the mismatch is explained.
 */
export function recommendSplit(params: {
  daysPerWeek: number;
  experience: ExperienceLevel;
  goal: ProgramGoal | null;
  requestedSplit?: string | null;
  historicalAverageDays?: number | null;
}): SplitRecommendation {
  const { daysPerWeek, experience, goal, requestedSplit, historicalAverageDays } = params;

  let adherenceCheckRequired = false;
  let adherenceNote: string | undefined = undefined;

  if (historicalAverageDays != null && daysPerWeek - historicalAverageDays >= 2) {
    adherenceCheckRequired = true;
    adherenceNote = `I noticed you've recently been averaging ${Math.round(historicalAverageDays)} training days per week. Jump to ${daysPerWeek} days is significant — would you prefer a 4 or 5-day plan for consistency, or proceed with ${daysPerWeek} days?`;
  }

  if (requestedSplit) {
    const validDays = VALID_DAY_COUNTS_FOR_SPLIT[requestedSplit];
    if (validDays?.includes(Math.round(daysPerWeek))) {
      const dayNames = requestedSplit === 'Push/Pull/Legs' && daysPerWeek === 6
        ? ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs']
        : requestedSplit === 'Full Body'
          ? FULL_BODY(daysPerWeek)
          : requestedSplit === 'Upper/Lower'
            ? (daysPerWeek === 2 ? ['Upper', 'Lower'] : ['Upper 1', 'Lower 1', 'Upper 2', 'Lower 2'])
            : ['Push', 'Pull', 'Legs'];
      return {
        split: requestedSplit, dayNames, honoredRequest: true,
        adherenceCheckRequired, adherenceNote,
        rationale: `You asked for ${requestedSplit}, and it fits well at ${daysPerWeek} days a week. ${reasonFor(requestedSplit, daysPerWeek, experience, goal)}${adherenceNote ? ` (${adherenceNote})` : ''}`,
      };
    }
    // Requested split doesn't fit — fall through to the table, but explain why.
    const table = tableRecommendation(daysPerWeek, experience);
    return {
      split: table.split, dayNames: table.dayNames, honoredRequest: false,
      adherenceCheckRequired, adherenceNote,
      rationale: `${requestedSplit} doesn't split cleanly across ${daysPerWeek} days, so I'd suggest ${table.split} instead. ${reasonFor(table.split, daysPerWeek, experience, goal)}${adherenceNote ? ` (${adherenceNote})` : ''}`,
    };
  }

  const table = tableRecommendation(daysPerWeek, experience);
  return {
    split: table.split, dayNames: table.dayNames, honoredRequest: true,
    adherenceCheckRequired, adherenceNote,
    rationale: `${reasonFor(table.split, daysPerWeek, experience, goal)}${adherenceNote ? ` (${adherenceNote})` : ''}`,
  };
}

