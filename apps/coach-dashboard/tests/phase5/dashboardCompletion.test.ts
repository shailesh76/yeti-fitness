import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { latestMeasurements, normalizeMeasurements } from '../../lib/assessmentData';
import { summarizeHealth } from '../../lib/adminHealthData';
import { authorizeAdminDataAction, dispatchAuthorizedAdminAction } from '../../../../supabase/functions/admin-data/authorization';
import { authorizeAndSignPhoto, isSupportedMethod, parseCanonicalObjectKey, parseExpiresIn } from '../../../../supabase/functions/get-r2-signed-url/security';
import { createGetR2SignedUrlHandler, type SignedUrlCaller } from '../../../../supabase/functions/get-r2-signed-url/handler';

vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));
import { orderProgressPhotos } from '../../lib/r2';

const read = (...parts: string[]) => fs.readFileSync(path.join(__dirname, '..', '..', ...parts), 'utf8');
const edgeFunction = () => fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'supabase', 'functions', 'get-r2-signed-url', 'index.ts'), 'utf8');

describe('assessments', () => {
  it('keeps only supported real metrics and orders them chronologically', () => {
    const rows = normalizeMeasurements([
      { id: '2', user_id: 'a', type: 'waist_cm', value: 81, logged_at: '2026-08-12T00:00:00Z' },
      { id: '1', user_id: 'a', type: 'weight_kg', value: 72, logged_at: '2026-08-10T00:00:00Z' },
      { id: '3', user_id: 'a', type: 'yeti_score', value: 99, logged_at: '2026-08-13T00:00:00Z' },
    ]);
    expect(rows.map((row) => row.id)).toEqual(['1', '2']);
    expect(latestMeasurements(rows).waist_cm?.value).toBe(81);
  });

  it('scopes roster and measurement queries and does not fabricate unsupported cards', () => {
    const page = read('app', 'dashboard', 'assessments', 'page.tsx');
    expect(page).toContain('fetchCoachClients()');
    expect(page).toContain(".eq('user_id', selectedId)");
    expect(page).not.toMatch(/Yeti Score|Muscle Mass|James Wilson|New Assessment/);
  });
});

describe('progress photos', () => {
  const athlete = '11111111-1111-4111-8111-111111111111';
  const coach = '22222222-2222-4222-8222-222222222222';
  const other = '33333333-3333-4333-8333-333333333333';
  const key = `progress-photos/${athlete}/1700000000000_front.jpg`;
  const makeHandler = (caller: SignedUrlCaller | null, overrides: Record<string, unknown> = {}) => {
    const calls = { assigned: [] as string[][], listed: [] as string[], signed: [] as Array<[string, number]> };
    const deps = {
      authenticate: vi.fn(async () => caller),
      isAssigned: vi.fn(async (coachId: string, athleteId: string) => { calls.assigned.push([coachId, athleteId]); return false; }),
      listPhotos: vi.fn(async (athleteId: string) => { calls.listed.push(athleteId); return [{ id: 'p', photo_key: key, notes: null, created_at: '2026-08-16T00:00:00Z' }]; }),
      sign: vi.fn(async (objectKey: string, ttl: number) => { calls.signed.push([objectKey, ttl]); return 'signed-url'; }),
      ...overrides,
    } as any;
    return { handler: createGetR2SignedUrlHandler(deps), deps, calls };
  };
  const request = (body: unknown, method = 'POST', auth = true) => new Request('https://edge.test/get-r2-signed-url', {
    method,
    headers: auth ? { Authorization: 'Bearer test', 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });

  it('orders signed photo views newest first and preserves broken-media state', () => {
    const ordered = orderProgressPhotos([
      { id: 'old', photoKey: 'progress-photos/a/old.jpg', notes: null, createdAt: '2026-01-01', url: null, error: 'Media unavailable' },
      { id: 'new', photoKey: 'progress-photos/a/new.jpg', notes: null, createdAt: '2026-02-01', url: 'signed', error: null },
    ]);
    expect(ordered.map((photo) => photo.id)).toEqual(['new', 'old']);
    expect(ordered[1].url).toBeNull();
  });

  it('uses coach_clients authorization and keeps R2 credentials server-side', () => {
    const edge = edgeFunction();
    const client = read('lib', 'r2.ts');
    expect(edge).toContain(".from('coach_clients')");
    expect(edge).toContain(".eq('coach_id', coachId)");
    expect(edge).toContain(".eq('athlete_id', athleteId)");
    expect(client).not.toMatch(/R2_SECRET_ACCESS_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('returns HTTP 401 for missing or invalid authentication', async () => {
    const { handler, deps } = makeHandler(null);
    expect((await handler(request({ action: 'list-progress-photos', userId: athlete }, 'POST', false))).status).toBe(401);
    expect(deps.sign).not.toHaveBeenCalled();
  });

  it('returns HTTP 405 before signing for unsupported methods', async () => {
    const { handler, deps } = makeHandler({ id: athlete, role: 'athlete' });
    expect((await handler(request(null, 'GET'))).status).toBe(405);
    expect(deps.authenticate).not.toHaveBeenCalled();
    expect(deps.sign).not.toHaveBeenCalled();
  });

  it.each([
    [{ id: other, role: 'athlete' }, false],
    [{ id: coach, role: 'coach' }, false],
    [{ id: coach, role: 'athlete' }, true],
    [{ id: coach, role: 'unknown' }, true],
  ])('returns HTTP 403 before metadata/signing for ineligible caller %#', async (caller, assigned) => {
    const { handler, deps } = makeHandler(caller as SignedUrlCaller, { isAssigned: vi.fn(async () => assigned) });
    expect((await handler(request({ action: 'list-progress-photos', userId: athlete }))).status).toBe(403);
    expect(deps.listPhotos).not.toHaveBeenCalled();
    expect(deps.sign).not.toHaveBeenCalled();
  });

  it.each([
    [{ id: athlete, role: 'athlete' }, false],
    [{ id: coach, role: 'coach' }, true],
    [{ id: other, role: 'admin' }, false],
  ])('returns HTTP 200 for an eligible caller %#', async (caller, assigned) => {
    const { handler, deps, calls } = makeHandler(caller as SignedUrlCaller, { isAssigned: vi.fn(async () => assigned) });
    const response = await handler(request({ action: 'list-progress-photos', userId: athlete, expiresIn: 300 }));
    expect(response.status).toBe(200);
    expect(calls.listed).toEqual([athlete]);
    expect(deps.sign).toHaveBeenCalledWith(key, 300);
  });

  it('returns HTTP 400 for malformed body, TTL, and cross-athlete key without signing', async () => {
    const { handler, deps } = makeHandler({ id: athlete, role: 'athlete' });
    expect((await handler(new Request('https://edge.test', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: 'null' }))).status).toBe(400);
    expect((await handler(request({ action: 'list-progress-photos', userId: athlete, expiresIn: 3601 }))).status).toBe(400);
    expect((await handler(request({ key: `progress-photos/${other}/x.jpg` }))).status).toBe(403);
    expect(deps.sign).not.toHaveBeenCalled();
  });

  it('does not sign wrong-athlete metadata but signs valid rows in the same response', async () => {
    const badKey = `progress-photos/${other}/bad.jpg`;
    const { handler, deps } = makeHandler({ id: athlete, role: 'athlete' }, {
      listPhotos: vi.fn(async () => [
        { id: 'bad', photo_key: badKey, notes: null, created_at: '2026-08-16T00:00:00Z' },
        { id: 'good', photo_key: key, notes: null, created_at: '2026-08-15T00:00:00Z' },
      ]),
    });
    const response = await handler(request({ action: 'list-progress-photos', userId: athlete }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.photos).toMatchObject([{ id: 'bad', url: null }, { id: 'good', url: 'signed-url' }]);
    expect(deps.sign).toHaveBeenCalledTimes(1);
    expect(deps.sign).toHaveBeenCalledWith(key, 3600);
  });

  it.each([
    ['owner', athlete, 'athlete', false],
    ['assigned coach', coach, 'coach', true],
    ['admin', other, 'admin', false],
  ])('allows %s to sign a valid photo', async (_label, callerId, role, assigned) => {
    const sign = vi.fn(async () => 'signed');
    await expect(authorizeAndSignPhoto({ callerId, role, requestedAthleteId: athlete, assigned, key, sign })).resolves.toBe('signed');
    expect(sign).toHaveBeenCalledWith(key, 3600);
  });

  it.each([
    ['unassigned coach', coach, 'coach', false],
    ['another athlete', other, 'athlete', false],
    ['relationship anomaly', coach, 'athlete', true],
    ['unknown role', coach, 'unknown', true],
  ])('rejects %s without invoking the signer', async (_label, callerId, role, assigned) => {
    const sign = vi.fn(async () => 'signed');
    await expect(authorizeAndSignPhoto({ callerId, role, requestedAthleteId: athlete, assigned, key, sign })).rejects.toThrow();
    expect(sign).not.toHaveBeenCalled();
  });

  it.each([
    `progress-photos/${athlete}/../secret.jpg`,
    `progress-photos/${athlete}/%2e%2e%2fsecret.jpg`,
    `progress-photos/${athlete}\\secret.jpg`,
    `progress-photos/${athlete}//secret.jpg`,
    `progress-photos/${athlete}-sibling/secret.jpg`,
    `progress-photos/${other}/secret.jpg`,
    `progress-photos/${athlete}/`,
  ])('rejects non-canonical or wrong-athlete key %s', async (maliciousKey) => {
    const sign = vi.fn(async () => 'signed');
    await expect(authorizeAndSignPhoto({ callerId: athlete, role: 'athlete', requestedAthleteId: athlete, assigned: false, key: maliciousKey, sign })).rejects.toThrow();
    expect(sign).not.toHaveBeenCalled();
  });

  it('rejects malformed athlete UUIDs and validates bounded numeric TTLs', async () => {
    const sign = vi.fn(async () => 'signed');
    await expect(authorizeAndSignPhoto({ callerId: athlete, role: 'athlete', requestedAthleteId: 'not-a-uuid', assigned: false, key, sign })).rejects.toThrow();
    for (const expiresIn of [0, -1, 3601, '300']) expect(() => parseExpiresIn(expiresIn)).toThrow();
    expect(parseExpiresIn(undefined)).toBe(3600);
    expect(parseExpiresIn(300)).toBe(300);
    expect(sign).not.toHaveBeenCalled();
  });

  it('keeps metadata constrained to the requested athlete and POST-only wiring', () => {
    const edge = edgeFunction();
    expect(edge).toContain(".eq('user_id', athleteId)");
    expect(edge).toContain('createGetR2SignedUrlHandler({');
    expect(isSupportedMethod('POST')).toBe(true);
    expect(isSupportedMethod('OPTIONS')).toBe(true);
    expect(isSupportedMethod('GET')).toBe(false);
    expect(isSupportedMethod('DELETE')).toBe(false);
    expect(parseCanonicalObjectKey(key).athleteId).toBe(athlete);
  });
});

describe('admin health', () => {
  it('derives KPIs only from telemetry and represents no-data success rate honestly', () => {
    expect(summarizeHealth(0, { total: 0, success: 0, failed: 0 })).toEqual({ recentErrors: 0, aiRequests: 0, aiSuccessRate: null, aiFailures: 0 });
    expect(summarizeHealth(83, { total: 4, success: 3, failed: 1 })).toMatchObject({ recentErrors: 83, aiSuccessRate: 75 });
  });

  it('uses the admin-only Edge Function contract and has no fake operational KPIs', () => {
    const page = read('app', 'admin', 'health', 'page.tsx');
    expect(page).toContain('/functions/v1/admin-data');
    expect(page).toContain("callAdminData('system_errors')");
    expect(page).toContain("callAdminData('ai_logs')");
    expect(page).not.toMatch(/100% HEALTHY|99\.9%|142,500|4\.8 \/ 5\.0|368 \/ 368/);
    expect(page).toContain('setErrorCount(errorPayload.error_count)');
    expect(page).toContain('summarizeHealth(errorCount, ai)');
    expect(page).not.toContain('summarizeHealth(errors.length');
    const middleware = read('middleware.ts');
    expect(middleware).toContain("pathname.startsWith('/admin') && profile?.role !== 'admin'");
    const adminHandler = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'supabase', 'functions', 'admin-data', 'index.ts'), 'utf8');
    expect(adminHandler).toContain('authorizeAdminDataAction(role, action ?? null)');
  });

  it.each([
    ['admin', 'system_errors', true, 200],
    ['admin', 'ai_logs', true, 200],
    ['coach', 'system_errors', false, 403],
    ['athlete', 'ai_logs', false, 403],
    [null, 'system_errors', false, 401],
    ['coach', 'dashboard_metrics', true, 200],
  ])('authorizes role %s for action %s correctly', (role, action, allowed, status) => {
    expect(authorizeAdminDataAction(role, action)).toMatchObject({ allowed, status });
  });

  it.each([
    [null, 'system_errors', 401, false],
    ['coach', 'system_errors', 403, false],
    ['coach', 'ai_logs', 403, false],
    ['athlete', 'system_errors', 403, false],
    ['admin', 'system_errors', 200, true],
    ['admin', 'ai_logs', 200, true],
    ['coach', 'dashboard_metrics', 200, true],
  ])('dispatches role %s action %s through the production boundary', async (role, action, status, dispatched) => {
    const dispatch = vi.fn(async () => ({ errors: Array(50).fill({}), error_count: 83 }));
    const result = await dispatchAuthorizedAdminAction(role, action, dispatch);
    expect(result.status).toBe(status);
    expect(dispatch).toHaveBeenCalledTimes(dispatched ? 1 : 0);
    if (dispatched && action === 'system_errors') expect(result.value).toMatchObject({ error_count: 83 });
  });

  it('wires an exact head-only count with matching system-error filters', () => {
    const adminHandler = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'supabase', 'functions', 'admin-data', 'index.ts'), 'utf8');
    expect(adminHandler).toContain("select('id', { count: 'exact', head: true })");
    expect(adminHandler).toContain('error_count: countResult.count');
    expect(adminHandler).not.toContain('error_count: countResult.count ?? 0');
    expect(adminHandler).toContain('countQ = countQ.lte');
    expect(adminHandler).toContain("countQ = countQ.eq('error_type', errorType)");
    expect(adminHandler).toContain("countQ = countQ.eq('platform', platform)");
  });
});
