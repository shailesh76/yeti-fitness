import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  classifyExerciseMedia,
  fetchAllExerciseMediaRows,
  formatForMediaUrl,
  hasDuplicateExerciseMediaUrl,
  isExternalMedia,
  isValidExerciseMediaUrl,
  matchesExerciseMediaFilter,
  orderExerciseMedia,
  previewErrorKey,
  resolveExerciseMediaUrl,
  type ExerciseMediaRecord,
} from '../../lib/exerciseMedia';

const managerSource = readFileSync('components/ExerciseMediaManager.tsx', 'utf8');
const pageSource = readFileSync('app/exercises/page.tsx', 'utf8');

function media(overrides: Partial<ExerciseMediaRecord>): ExerciseMediaRecord {
  return {
    id: 'row', exercise_id: 'exercise', media_type: 'image', file_format: 'webp',
    r2_key: null, url: 'https://cdn.example.com/image.webp', thumbnail_url: null,
    is_primary: false, media_status: 'READY', media_notes: null, created_at: null,
    ...overrides,
  };
}

function completeCatalog(exerciseCount: number): ExerciseMediaRecord[] {
  return Array.from({ length: exerciseCount }, (_, exerciseIndex) => {
    const exerciseId = `exercise-${exerciseIndex}`;
    return [
      media({ id: `${exerciseId}-gif`, exercise_id: exerciseId, media_type: 'gif', file_format: 'gif', url: `https://cdn.example.com/${exerciseId}.gif` }),
      media({ id: `${exerciseId}-video`, exercise_id: exerciseId, media_type: 'video', file_format: 'mp4', url: `https://cdn.example.com/${exerciseId}.mp4` }),
      media({ id: `${exerciseId}-thumbnail`, exercise_id: exerciseId, media_type: 'thumbnail', file_format: 'webp', url: `https://cdn.example.com/${exerciseId}.webp` }),
    ];
  }).flat();
}

describe('exercise media URL management', () => {
  it('accepts HTTPS CDN locators and rejects unsafe or malformed protocols', () => {
    expect(isValidExerciseMediaUrl('https://cdn.example.com/a.gif', 'gif')).toBe(true);
    expect(isValidExerciseMediaUrl('HTTPS://cdn.example.com/A.GIF', 'gif')).toBe(true);
    expect(isValidExerciseMediaUrl('https://cdn.example.com/file.gif?x=1#preview', 'gif')).toBe(true);
    expect(isValidExerciseMediaUrl('https://cdn.example.com/signed/asset?token=1', 'gif')).toBe(true);
    for (const value of [
      'http://cdn.example.com/a.gif', 'javascript:alert(1)', 'data:image/gif;base64,abc',
      'blob:https://cdn.example.com/id', 'file:///tmp/a.gif', '', '   ',
      'https://cdn.example.com/bad url.gif', 'not a URL',
    ]) expect(isValidExerciseMediaUrl(value, 'gif')).toBe(false);
  });

  it('rejects recognized extensions that conflict with the selected media type', () => {
    expect(isValidExerciseMediaUrl('https://cdn.example.com/a.mp4', 'gif')).toBe(false);
    expect(isValidExerciseMediaUrl('https://cdn.example.com/a.gif', 'video')).toBe(false);
    expect(isValidExerciseMediaUrl('https://cdn.example.com/a.mp4', 'image')).toBe(false);
    expect(isValidExerciseMediaUrl('https://cdn.example.com/a.gif', 'thumbnail')).toBe(false);
    expect(isValidExerciseMediaUrl('https://cdn.example.com/a.MP4?x=1', 'video')).toBe(true);
    for (const extension of ['webp', 'jpg', 'jpeg', 'png']) {
      expect(isValidExerciseMediaUrl(`https://cdn.example.com/a.${extension}`, 'image')).toBe(true);
    }
  });

  it('maps media types and image extensions to the live file-format contract', () => {
    expect(formatForMediaUrl('gif', 'https://cdn.example.com/a')).toBe('gif');
    expect(formatForMediaUrl('video', 'https://cdn.example.com/a')).toBe('mp4');
    expect(formatForMediaUrl('image', 'https://cdn.example.com/a.png')).toBe('png');
    expect(formatForMediaUrl('image', 'https://cdn.example.com/a.jpeg')).toBe('jpg');
    expect(formatForMediaUrl('image', 'https://cdn.example.com/a')).toBe('webp');
  });

  it('orders primary media first and then uses deterministic type ordering', () => {
    const rows = orderExerciseMedia([
      media({ id: 'video', media_type: 'video', file_format: 'mp4' }),
      media({ id: 'image' }),
      media({ id: 'gif', media_type: 'gif', file_format: 'gif' }),
      media({ id: 'primary', is_primary: true }),
    ]);
    expect(rows.map((row) => row.id)).toEqual(['primary', 'gif', 'video', 'image']);
  });

  it('allows removal only for URL-only rows', () => {
    expect(isExternalMedia(media({ r2_key: null }))).toBe(true);
    expect(isExternalMedia(media({ r2_key: 'exercises/demo.webp' }))).toBe(false);
  });

  it('blocks duplicate URLs for the same exercise while allowing the edited row itself', () => {
    const rows = [media({ id: 'existing', url: 'https://cdn.example.com/a.webp' })];
    expect(hasDuplicateExerciseMediaUrl(rows, ' https://cdn.example.com/a.webp ')).toBe(true);
    expect(hasDuplicateExerciseMediaUrl(rows, 'https://cdn.example.com/a.webp', 'existing')).toBe(false);
    expect(hasDuplicateExerciseMediaUrl(rows, 'https://cdn.example.com/b.webp')).toBe(false);
  });

  it('classifies completeness from usable media locators without double-counting', () => {
    const gif = media({ id: 'gif', media_type: 'gif', file_format: 'gif', url: 'https://cdn.example.com/a.gif' });
    const video = media({ id: 'video', media_type: 'video', file_format: 'mp4', url: 'https://cdn.example.com/a.mp4' });
    const thumbnail = media({ id: 'thumbnail', media_type: 'thumbnail', url: null, r2_key: 'exercise/a.webp' });
    expect(classifyExerciseMedia([gif, video, thumbnail]).complete).toBe(true);
    expect(matchesExerciseMediaFilter([video, thumbnail], 'missing_gif')).toBe(true);
    expect(matchesExerciseMediaFilter([gif, thumbnail], 'missing_video')).toBe(true);
    expect(matchesExerciseMediaFilter([gif, video], 'missing_thumbnail')).toBe(true);
    expect(classifyExerciseMedia([media({ media_type: 'gif', r2_key: ' ', url: null })]).missingGif).toBe(true);
    expect(classifyExerciseMedia([gif, media({ ...gif, id: 'gif-2' }), video, thumbnail]).complete).toBe(true);
  });

  it('loads all 1,188 media rows across the 1,000-row backend boundary before classifying', async () => {
    const rows = completeCatalog(396);
    const calls: Array<[number, number]> = [];
    const loaded = await fetchAllExerciseMediaRows(
      rows.map((row) => row.exercise_id),
      async (_ids, from, to) => {
        calls.push([from, to]);
        return { data: rows.slice(from, to + 1), error: null };
      },
      { pageSize: 1000, idChunkSize: 500 },
    );
    expect(calls).toEqual([[0, 999], [1000, 1999]]);
    expect(loaded).toHaveLength(1188);
    const grouped = new Map<string, ExerciseMediaRecord[]>();
    for (const row of loaded) grouped.set(row.exercise_id, [...(grouped.get(row.exercise_id) ?? []), row]);
    expect(grouped).toHaveLength(396);
    expect(Array.from(grouped.values()).every((exerciseRows) => classifyExerciseMedia(exerciseRows).complete)).toBe(true);
  });

  it('requests an empty sentinel page when exactly 1,000 rows are returned', async () => {
    const rows = completeCatalog(334).slice(0, 1000);
    const calls: number[] = [];
    const loaded = await fetchAllExerciseMediaRows(['exercise'], async (_ids, from, to) => {
      calls.push(from);
      return { data: rows.slice(from, to + 1), error: null };
    });
    expect(calls).toEqual([0, 1000]);
    expect(loaded).toHaveLength(1000);
  });

  it('loads the second page when 1,001 rows exist', async () => {
    const rows = completeCatalog(334).slice(0, 1001);
    const calls: number[] = [];
    const loaded = await fetchAllExerciseMediaRows(['exercise'], async (_ids, from, to) => {
      calls.push(from);
      return { data: rows.slice(from, to + 1), error: null };
    });
    expect(calls).toEqual([0, 1000]);
    expect(loaded).toHaveLength(1001);
  });

  it('fails honestly when a later media page fails', async () => {
    const rows = completeCatalog(334).slice(0, 1000);
    await expect(fetchAllExerciseMediaRows(['exercise'], async (_ids, from, to) => {
      if (from === 1000) return { data: null, error: { message: 'page denied' } };
      return { data: rows.slice(from, to + 1), error: null };
    })).rejects.toThrow('Could not load complete exercise media: page denied');
  });

  it('deduplicates media IDs across overlapping backend pages', async () => {
    const first = media({ id: 'one' });
    const second = media({ id: 'two' });
    const loaded = await fetchAllExerciseMediaRows(['exercise'], async (_ids, from) => ({
      data: from === 0 ? [first, second] : [second],
      error: null,
    }), { pageSize: 2 });
    expect(loaded.map((row) => row.id)).toEqual(['one', 'two']);
  });

  it('uses locator-aware preview error keys so an edited row can recover', () => {
    const broken = media({ id: 'same-row', url: 'https://cdn.example.com/broken.webp' });
    const corrected = media({ id: 'same-row', url: 'https://cdn.example.com/valid.webp' });
    const failedKeys = new Set([previewErrorKey(broken, broken.url)]);
    expect(failedKeys.has(previewErrorKey(broken, broken.url))).toBe(true);
    expect(failedKeys.has(previewErrorKey(corrected, corrected.url))).toBe(false);
    expect(previewErrorKey(media({ id: 'r2', url: null, r2_key: 'a.webp' }), 'https://signed.example.com/one'))
      .not.toBe(previewErrorKey(media({ id: 'r2', url: null, r2_key: 'a.webp' }), 'https://signed.example.com/two'));
  });

  it('uses authenticated RLS mutations and never deletes an R2 object', () => {
    expect(managerSource).toContain("supabase.from('exercise_media').insert");
    expect(managerSource).toContain("supabase.from('exercise_media').update");
    expect(managerSource).toContain("supabase.from('exercise_media').delete");
    expect(managerSource).toContain('r2_key: null');
    expect(managerSource).toContain(".eq('id', form.row.id).eq('exercise_id', exerciseId)");
    expect(managerSource).toContain(".eq('id', row.id).eq('exercise_id', exerciseId)");
    expect(managerSource).not.toMatch(/functions\.invoke\(['"][^'"]*(delete|remove)[^'"]*r2/i);
    expect(managerSource).toContain('await onChanged()');
  });

  it('gates controls by role and exposes all requested URL actions', () => {
    expect(managerSource).toContain('canManage &&');
    expect(managerSource).toContain("startAdd('gif')");
    expect(managerSource).toContain("startAdd('video')");
    expect(managerSource).toContain("startAdd('image')");
    expect(managerSource).toContain('startEdit(item)');
    expect(managerSource).toContain('removeExternalMedia(item)');
    expect(managerSource).toContain('canManage && isExternalMedia(item)');
    expect(managerSource).toContain('This exercise already uses that media URL.');
    expect(managerSource).toContain("disabled={form.mode === 'edit'}");
    expect(managerSource).not.toContain('onChange={(event) => setForm({ ...form, primary:');
  });

  it('loads complete media metadata and applies global completeness filtering before pagination', () => {
    expect(pageSource).toContain('is_primary, media_status, media_notes, created_at');
    expect(pageSource).toContain(".in('exercise_id', idChunk)");
    expect(pageSource).toContain('.range(from, to)');
    expect(pageSource).toContain('matchesExerciseMediaFilter');
    expect(pageSource).toContain('nextTotalCount = filtered.length');
    expect(pageSource).toContain('nextExercises = filtered.slice(from, from + pageSize)');
    expect(pageSource).toContain('<option value="missing_gif">Missing GIF</option>');
    expect(pageSource).toContain('<option value="missing_video">Missing Video</option>');
    expect(pageSource).toContain('<option value="missing_thumbnail">Missing Thumbnail</option>');
    expect(pageSource).not.toContain("query = query.eq('media_status', mediaStatusFilter)");
    expect(pageSource).toContain("data?.role === 'coach' || data?.role === 'admin'");
  });

  it('prefers valid signed R2 media over dead or placeholder external URLs', async () => {
    const row = media({
      r2_key: 'exercises/barbell-bench-press/demo.mp4',
      url: 'https://cdn.yetifitness.app/exercises/barbell-bench-press/demo.mp4',
    });
    const signedUrl = 'https://signed.r2.cloudflarestorage.com/exercises/barbell-bench-press/demo.mp4?token=123';
    const signer = async (key: string) => (key === row.r2_key ? signedUrl : null);

    const resolved = await resolveExerciseMediaUrl(row, signer);
    expect(resolved).toBe(signedUrl);
  });

  it('prefers valid signed R2 media even when external URL is syntactically valid', async () => {
    const row = media({
      r2_key: 'exercises/back-squat/demo.mp4',
      url: 'https://cdn.example.com/custom-valid.mp4',
    });
    const signedUrl = 'https://signed.r2.cloudflarestorage.com/exercises/back-squat/demo.mp4?token=456';
    const signer = async (key: string) => (key === row.r2_key ? signedUrl : null);

    const resolved = await resolveExerciseMediaUrl(row, signer);
    expect(resolved).toBe(signedUrl);
  });

  it('falls back to valid external URL when R2 signing fails or returns null', async () => {
    const row = media({
      r2_key: 'exercises/missing/demo.mp4',
      url: 'https://cdn.example.com/fallback.mp4',
    });
    const failingSigner = async () => null;

    const resolved = await resolveExerciseMediaUrl(row, failingSigner);
    expect(resolved).toBe('https://cdn.example.com/fallback.mp4');

    const throwingSigner = async () => { throw new Error('Signing failed'); };
    const resolvedFromThrow = await resolveExerciseMediaUrl(row, throwingSigner);
    expect(resolvedFromThrow).toBe('https://cdn.example.com/fallback.mp4');
  });

  it('resolves external URL normally for URL-only rows without calling R2 signer', async () => {
    const row = media({
      r2_key: null,
      url: 'https://cdn.example.com/coach-upload.gif',
    });
    let signerCalled = false;
    const signer = async () => { signerCalled = true; return 'https://signed.com'; };

    const resolved = await resolveExerciseMediaUrl(row, signer);
    expect(signerCalled).toBe(false);
    expect(resolved).toBe('https://cdn.example.com/coach-upload.gif');
  });

  it('resolves signed R2 URL for R2-only rows with null external URL', async () => {
    const row = media({
      r2_key: 'exercises/barbell-curl/thumbnail.webp',
      url: null,
    });
    const signedUrl = 'https://signed.r2.cloudflarestorage.com/thumbnail.webp';
    const signer = async (key: string) => (key === row.r2_key ? signedUrl : null);

    const resolved = await resolveExerciseMediaUrl(row, signer);
    expect(resolved).toBe(signedUrl);
  });

  it('returns null when neither locator is valid or available', async () => {
    const emptyRow = media({ r2_key: null, url: null });
    expect(await resolveExerciseMediaUrl(emptyRow)).toBeNull();

    const invalidUrlRow = media({ r2_key: null, url: 'not-a-valid-url' });
    expect(await resolveExerciseMediaUrl(invalidUrlRow)).toBeNull();

    const failedR2EmptyUrl = media({ r2_key: 'key', url: null });
    expect(await resolveExerciseMediaUrl(failedR2EmptyUrl, async () => null)).toBeNull();
  });

  it('implements generic locator semantics without hardcoded CDN hostnames', () => {
    expect(managerSource).not.toMatch(/cdn\.yeti\.fit/i);
    expect(managerSource).not.toMatch(/cdn\.yetifitness\.app/i);
    expect(managerSource).toContain('resolveExerciseMediaUrl(item,');
  });
});
