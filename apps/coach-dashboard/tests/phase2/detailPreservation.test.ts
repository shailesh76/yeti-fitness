import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const detail = fs.readFileSync(path.resolve(__dirname, '../../app/dashboard/[userId]/page.tsx'), 'utf8');
const legacy = fs.readFileSync(path.resolve(__dirname, '../../app/dashboard/athletes/[id]/page.tsx'), 'utf8');

/**
 * The committed athlete-detail page was already a real, data-driven screen. A
 * first pass at Phase 2 replaced it wholesale and silently dropped trainer
 * notes, the AI progression queue, and messaging. These tests pin the existing
 * features so that can't happen again.
 */
describe('existing athlete-detail features are preserved', () => {
  it('still loads the athlete from the route param', () => {
    expect(detail).toContain('getClientDetail(params.userId)');
  });

  it('keeps trainer notes', () => {
    for (const api of ['getTrainerNotes', 'addTrainerNote', 'deleteTrainerNote']) {
      expect(detail).toContain(api);
    }
  });

  it('keeps the AI progression recommendation queue', () => {
    expect(detail).toContain('progression_recommendations');
    expect(detail).toContain('handleRecAction');
  });

  it('keeps athlete messaging', () => {
    expect(detail).toContain('conversations');
    expect(detail).toContain('conversation_members');
  });

  it('keeps the real strength/session queries', () => {
    expect(detail).toContain('workout_sessions');
    expect(detail).toContain('session_sets');
  });

  it('keeps the shared nutrition target card rather than a duplicate implementation', () => {
    expect(detail).toContain('NutritionTargetCard');
    expect(detail).not.toContain('daily_protein_target');
  });
});

describe('Phase 2 additions on the detail page', () => {
  it('assigns an existing program through the shared store action', () => {
    expect(detail).toContain('assignExistingPlan');
    expect(detail).toContain('templates.map');
  });

  it('surfaces the current plan before replacing it', () => {
    expect(detail).toContain('Currently on');
    expect(detail).toContain('stays in their history');
  });

  it('distinguishes unauthorized from missing athletes', () => {
    expect(detail).toContain('This athlete is not on your roster');
    expect(detail).toContain('Athlete not found');
    expect(detail).toContain('detailStatus');
  });
});

describe('legacy /dashboard/athletes/[id] route', () => {
  it('no longer renders the John Doe mock', () => {
    for (const fake of ['John Doe', 'Yeti Score', 'Bench Press Progression', 'Plateau Detected']) {
      expect(legacy).not.toContain(fake);
    }
  });

  it('redirects to the canonical detail route', () => {
    expect(legacy).toContain('redirect(`/dashboard/${params.id}`)');
  });
});
