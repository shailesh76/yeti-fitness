import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve(__dirname, '../supabase/migrations/20260816120000_exercise_media_external_urls.sql'),
  'utf8',
);

describe('exercise media external URL migration', () => {
  it('allows URL-only rows without weakening locator validation', () => {
    expect(migration).toMatch(/ALTER COLUMN r2_key DROP NOT NULL/i);
    expect(migration).toContain('exercise_media_locator_check');
    expect(migration).toMatch(/r2_key IS NOT NULL\s+OR \(url IS NOT NULL AND url ~\* '\^https:\/\//);
    expect(migration).not.toMatch(/\^http:\/\//i);
  });

  it('preserves R2 uniqueness and adds per-exercise URL uniqueness', () => {
    expect(migration).toContain("c.conname = 'exercise_media_exercise_id_r2_key'");
    expect(migration).toContain('duplicate R2 keys for an exercise');
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS exercise_media_exercise_id_url_key/);
    expect(migration).toMatch(/ON public\.exercise_media \(exercise_id, url\)\s+WHERE url IS NOT NULL/);
    expect(migration).toMatch(/GROUP BY exercise_id, r2_key/);
    expect(migration).toMatch(/GROUP BY exercise_id, url/);
  });

  it.each(['INSERT', 'UPDATE', 'DELETE'])('adds a coach/admin-only %s policy', (command) => {
    expect(migration).toMatch(new RegExp(`FOR ${command} TO authenticated`));
  });

  it('uses server-side roles and introduces no athlete mutation policy', () => {
    expect(migration.match(/profiles\.id = auth\.uid\(\)/g)).toHaveLength(4);
    expect(migration.match(/profiles\.role IN \('coach', 'admin'\)/g)).toHaveLength(4);
    expect(migration).not.toMatch(/role\s*=\s*'athlete'|IN \([^)]*'athlete'/i);
    expect(migration).not.toMatch(/service_role/);
    expect(migration).toContain("p.polcmd IN ('a', 'i', 'u', 'd')");
    expect(migration).toContain('exercise_media has an unreviewed mutation policy');
  });
});
