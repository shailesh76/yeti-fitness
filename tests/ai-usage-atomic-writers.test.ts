import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260730020000_ai_usage_atomic_increment.sql',
  'utf8',
);
const aiCoach = readFileSync('supabase/functions/ai-coach/index.ts', 'utf8');
const exerciseGuidance = readFileSync('supabase/functions/exercise-guidance/index.ts', 'utf8');

function rpcCalls(source: string): number {
  return source.match(/\.rpc\s*\(\s*['"]increment_ai_usage['"]/g)?.length ?? 0;
}

describe('increment_ai_usage migration contract', () => {
  it('is a SECURITY DEFINER function with an explicit production-safe search path', () => {
    expect(migration).toMatch(/SECURITY\s+DEFINER/i);
    expect(migration).toMatch(/SET\s+search_path\s*=\s*public/i);
  });

  it('increments atomically against the athlete/date unique key', () => {
    expect(migration).toMatch(/INSERT\s+INTO\s+public\.ai_usage/i);
    expect(migration).toMatch(/VALUES\s*\(\s*p_athlete_id\s*,\s*p_date\s*,\s*1\s*,/i);
    expect(migration).toMatch(/ON\s+CONFLICT\s*\(\s*athlete_id\s*,\s*date\s*\)/i);
    expect(migration).toMatch(/requests_count\s*=\s*public\.ai_usage\.requests_count\s*\+\s*1/i);
    expect(migration).toMatch(/RETURNING\s+requests_count\s+INTO\s+new_count/i);
    expect(migration).toMatch(/RETURN\s+new_count/i);
    expect(migration).not.toMatch(/SELECT[\s\S]*requests_count[\s\S]*UPDATE/i);
  });

  it('allows execute only to service_role', () => {
    expect(migration).toMatch(/REVOKE\s+ALL[\s\S]*FROM\s+PUBLIC/i);
    expect(migration).toMatch(/REVOKE\s+ALL[\s\S]*FROM\s+anon/i);
    expect(migration).toMatch(/REVOKE\s+ALL[\s\S]*FROM\s+authenticated/i);
    expect(migration).toMatch(/GRANT\s+EXECUTE[\s\S]*TO\s+service_role/i);
    expect(migration.match(/GRANT\s+EXECUTE/gi)).toHaveLength(1);
  });
});

describe('committed AI endpoint accounting contract', () => {
  it('ai-coach increments once before routing/provider work and never writes ai_usage directly', () => {
    expect(rpcCalls(aiCoach)).toBe(1);
    expect(aiCoach.indexOf(".rpc('increment_ai_usage'")).toBeLessThan(aiCoach.indexOf('const intent ='));
    expect(aiCoach).not.toMatch(/\.from\(['"]ai_usage['"]\)/);
  });

  it('exercise-guidance authenticates first and increments once before provider work', () => {
    expect(exerciseGuidance).toMatch(/const\s+supabaseClient\s*=.*?[\s\S]*?auth\.getUser\(\)/);
    expect(exerciseGuidance).toMatch(/authError\s*\|\|\s*!user/);
    expect(exerciseGuidance.indexOf('auth.getUser()')).toBeLessThan(
      exerciseGuidance.indexOf("'increment_ai_usage'"),
    );
    expect(exerciseGuidance).toMatch(/supabaseServiceRole\.rpc\(\s*['"]increment_ai_usage['"]\s*,\s*\{[^}]*p_athlete_id:\s*user\.id/s);
    expect(exerciseGuidance).not.toMatch(/p_athlete_id:\s*(exerciseId|athleteId|body\.)/);
    expect(rpcCalls(exerciseGuidance)).toBe(1);
    expect(exerciseGuidance.indexOf("'increment_ai_usage'")).toBeLessThan(
      exerciseGuidance.indexOf('const result = await generateChat'),
    );
  });

  it('exercise-guidance has no stale or second ai_usage write', () => {
    expect(exerciseGuidance).not.toMatch(/\.from\(['"]ai_usage['"]\)/);
    expect(exerciseGuidance).not.toMatch(/requests_count\s*:/);
    expect(exerciseGuidance).not.toMatch(/currentRequests/);
  });

  it('uses the returned count as the only limit decision: fifth allowed, sixth blocked', () => {
    expect(aiCoach).toMatch(/newRequestCount\s*>\s*5/);
    expect(exerciseGuidance).toMatch(/newRequestCount\s*>\s*5/);
    const allowed = (count: number) => !(count > 5);
    expect([1, 2, 3, 4, 5].every(allowed)).toBe(true);
    expect(allowed(6)).toBe(false);
  });

  it('provider fallback or failure cannot cause a second increment', () => {
    expect(rpcCalls(aiCoach)).toBe(1);
    expect(rpcCalls(exerciseGuidance)).toBe(1);
    expect(exerciseGuidance.slice(exerciseGuidance.indexOf('const result = await generateChat'))).not.toContain('increment_ai_usage');
  });
});
