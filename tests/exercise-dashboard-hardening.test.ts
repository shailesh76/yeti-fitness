import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  classifyExerciseMedia,
  fetchAllExerciseRows,
  resolveExerciseMediaUrl,
  type ExerciseMediaRecord,
} from '../apps/coach-dashboard/lib/exerciseMedia';
import { canEditExercise } from '../apps/coach-dashboard/lib/exerciseEditor';

const read = (path: string) => readFileSync(path, 'utf8');
const middleware = read('apps/coach-dashboard/middleware.ts');
const sidebar = read('apps/coach-dashboard/components/Sidebar.tsx');
const library = read('apps/coach-dashboard/app/exercises/page.tsx');
const manager = read('apps/coach-dashboard/components/ExerciseMediaManager.tsx');
const editor = read('apps/coach-dashboard/app/exercises/[id]/edit/page.tsx');
const creator = read('apps/coach-dashboard/app/exercises/new/page.tsx');

function media(overrides: Partial<ExerciseMediaRecord> = {}): ExerciseMediaRecord {
  return {
    id: 'media', exercise_id: 'exercise', media_type: 'image', file_format: 'webp',
    r2_key: 'exercises/example.webp', url: null, thumbnail_url: null, is_primary: false,
    media_status: 'READY', media_notes: null, created_at: null, ...overrides,
  };
}

describe('Exercise Dashboard authentication hardening', () => {
  it('protects the complete exercises route tree in middleware', () => {
    expect(middleware).toContain("'/exercises'");
    expect(middleware).toContain("'/exercises/:path*'");
    expect(middleware).toContain('pathname.startsWith(prefix)');
    expect(middleware).toContain("loginUrl.pathname = '/login'");
    expect(middleware).toContain('Authentication check failed:');
  });

  it('does not invent a Coach identity while the profile is unresolved', () => {
    expect(sidebar).toContain('useState<string | null>(null)');
    expect(sidebar).not.toContain('useState<string>("coach")');
    expect(sidebar).toContain('{userRole &&');
  });

  it('does not interpret an unauthenticated catalog request as a legitimate zero result', () => {
    expect(library).toContain("type CatalogAuthState = 'checking' | 'authenticated' | 'unauthenticated'");
    expect(library).toContain("if (authState !== 'authenticated') return;");
    expect(library).toContain("if (authState === 'authenticated') void fetchExercises()");
    expect(library).toContain("router.replace('/login')");
    expect(library.indexOf("if (authState !== 'authenticated') {")).toBeLessThan(library.indexOf('No exercises found'));
  });
});

describe('Exercise Dashboard catalog filters', () => {
  it('preserves source_type filtering and normalized multi-word search', () => {
    expect(library).toContain("query.eq('source_type', 'yeti_first_party')");
    expect(library).toContain("query.eq('source_type', 'legacy_catalog')");
    expect(library).toContain("s.replace(/[\\s-]+/g, '%')");
    for (const field of ['name', 'slug', 'equipment', 'primary_muscle', 'target_muscle']) {
      expect(library).toContain(`\`${field}.ilike.%\${pattern}%\``);
    }
  });

  it('loads canonical taxonomy values instead of sending friendly labels as database values', () => {
    expect(library).toContain("from('exercise_taxonomy')");
    expect(library).toContain("['category', 'muscle', 'equipment']");
    expect(library).toContain('value={value}');
    expect(library).not.toContain('<option value="air bike">Air Bike</option>');
    expect(library).toContain('<option value="beginner">Beginner</option>');
  });

  it('loads more than 1,000 matching exercises in bounded pages', async () => {
    const rows = Array.from({ length: 2491 }, (_, index) => ({ id: `exercise-${index}` }));
    const calls: Array<[number, number]> = [];
    const result = await fetchAllExerciseRows(async (from, to) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1), count: rows.length, error: null };
    });
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    expect(result.rows).toHaveLength(2491);
    expect(result.count).toBe(2491);
  });
});

describe('Exercise Dashboard media publication semantics', () => {
  it('does not classify TO_CREATE locators as complete', () => {
    const planned = [
      media({ id: 'gif', media_type: 'gif', file_format: 'gif', media_status: 'TO_CREATE' }),
      media({ id: 'video', media_type: 'video', file_format: 'mp4', media_status: 'TO_CREATE' }),
      media({ id: 'thumb', media_type: 'thumbnail', media_status: 'TO_CREATE' }),
    ];
    expect(classifyExerciseMedia(planned).complete).toBe(false);
  });

  it('does not request a signed preview URL for TO_CREATE media', async () => {
    let signerCalls = 0;
    const result = await resolveExerciseMediaUrl(media({ media_status: 'TO_CREATE' }), async () => {
      signerCalls += 1;
      return 'https://signed.example.com/placeholder';
    });
    expect(result).toBeNull();
    expect(signerCalls).toBe(0);
    expect(manager).toContain('Planned media');
    expect(manager).toContain('This asset is not published yet.');
  });

  it('allows READY media with all required types to qualify as complete', () => {
    expect(classifyExerciseMedia([
      media({ id: 'gif', media_type: 'gif', file_format: 'gif' }),
      media({ id: 'video', media_type: 'video', file_format: 'mp4' }),
      media({ id: 'thumb', media_type: 'thumbnail' }),
    ]).complete).toBe(true);
  });
});

describe('Exercise Editor relation and role safety', () => {
  it('surfaces every relation query error before constructing a savable form', () => {
    for (const error of ['aliasesError', 'tagsError', 'musclesError', 'alternativesError', 'progressionsError', 'regressionsError']) {
      expect(editor).toContain(error);
    }
    expect(editor).toContain('Exercise relationships could not be loaded. No changes were made.');
    expect(editor.indexOf('const relationError')).toBeLessThan(editor.indexOf('const nextForm'));
    expect(editor).toContain("setLoadState('error')");
  });

  it('distinguishes expired sessions from authenticated permission denials', () => {
    expect(editor).toContain("type LoadState = 'loading' | 'ready' | 'not-found' | 'unauthenticated' | 'denied' | 'error'");
    expect(editor).toContain('Your session has expired');
    expect(editor).toContain('You do not have permission to edit this exercise');
    expect(creator).toContain("'ready' | 'unauthenticated' | 'denied' | 'error'");
    expect(creator).toContain('Only coaches can create custom exercises');
    expect(canEditExercise('admin', 'admin', { source_type: 'yeti_first_party', created_by_coach_id: null })).toBe(true);
    expect(canEditExercise('coach', 'coach', { source_type: 'yeti_first_party', created_by_coach_id: null })).toBe(false);
    expect(canEditExercise('coach', 'coach', { source_type: 'custom', created_by_coach_id: 'coach' })).toBe(true);
  });
});
