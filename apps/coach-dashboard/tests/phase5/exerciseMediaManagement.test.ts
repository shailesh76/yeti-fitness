import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  classifyExerciseMedia,
  formatForMediaUrl,
  hasDuplicateExerciseMediaUrl,
  isExternalMedia,
  isValidExerciseMediaUrl,
  matchesExerciseMediaFilter,
  orderExerciseMedia,
  previewErrorKey,
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
    expect(pageSource).toContain(".in('exercise_id', exerciseIds)");
    expect(pageSource).toContain('matchesExerciseMediaFilter');
    expect(pageSource).toContain('nextTotalCount = filtered.length');
    expect(pageSource).toContain('nextExercises = filtered.slice(from, from + pageSize)');
    expect(pageSource).toContain('<option value="missing_gif">Missing GIF</option>');
    expect(pageSource).toContain('<option value="missing_video">Missing Video</option>');
    expect(pageSource).toContain('<option value="missing_thumbnail">Missing Thumbnail</option>');
    expect(pageSource).not.toContain("query = query.eq('media_status', mediaStatusFilter)");
    expect(pageSource).toContain("data?.role === 'coach' || data?.role === 'admin'");
  });
});
