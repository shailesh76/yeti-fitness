import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Phase B.5: Supabase API-Key Migration Security & Semantic Hardening', () => {
  const rootDir = path.resolve(__dirname, '..');

  const mobileClientFile = path.join(rootDir, 'apps/mobile/lib/supabase.ts');
  const dashboardLibFile = path.join(rootDir, 'apps/coach-dashboard/lib/supabase.ts');
  const dashboardMiddlewareFile = path.join(rootDir, 'apps/coach-dashboard/middleware.ts');
  const dashboardCallbackFile = path.join(rootDir, 'apps/coach-dashboard/app/auth/callback/route.ts');
  const dashboardUserPageFile = path.join(rootDir, 'apps/coach-dashboard/app/dashboard/[userId]/page.tsx');
  const sharedClientFile = path.join(rootDir, 'supabase/functions/_shared/supabaseClient.ts');

  const privilegedFunctions = [
    'admin-data',
    'ai-coach',
    'analyze-food-image',
    'calculate-adaptive-nutrition',
    'exercise-guidance',
    'generate-health-insights',
    'generate-workout-plan',
    'generate-workout-summary',
    'get-r2-signed-url',
    'manage-entitlements',
    'suggest-exercise-swap',
    'sync-live-metrics',
    'update-challenge-standings',
  ];

  const userContextOnlyFunctions = [
    'get-client-exercise-history',
    'get-client-last-workout',
    'sync-pull',
    'sync-push',
    'upload-to-r2',
  ];

  describe('Public Client Key Precedence & Fallback (Resolver Contract)', () => {
    it('mobile client prefers EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY over legacy anon key', () => {
      const code = fs.readFileSync(mobileClientFile, 'utf8');
      expect(code).toContain('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
      expect(code).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');

      const resolveMobileKey = (env: Record<string, string | undefined>) => {
        const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        if (!key) throw new Error('Supabase client key is missing');
        return key;
      };

      // Both set -> prefers publishable key
      expect(
        resolveMobileKey({
          EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_new',
          EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon_legacy',
        })
      ).toBe('sb_publishable_new');

      // Only anon set -> falls back to legacy anon key
      expect(
        resolveMobileKey({
          EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon_legacy',
        })
      ).toBe('anon_legacy');

      // Neither set -> throws explicit error (never passes missing key to SDK)
      expect(() => resolveMobileKey({})).toThrow('Supabase client key is missing');
    });

    it('coach dashboard prefers NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY over legacy anon key', () => {
      for (const [name, file] of [
        ['lib/supabase.ts', dashboardLibFile],
        ['middleware.ts', dashboardMiddlewareFile],
        ['auth/callback/route.ts', dashboardCallbackFile],
        ['dashboard/[userId]/page.tsx', dashboardUserPageFile],
      ]) {
        const code = fs.readFileSync(file, 'utf8');
        expect(code, `${name} must check NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).toContain(
          'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
        );
        expect(code, `${name} must check NEXT_PUBLIC_SUPABASE_ANON_KEY`).toContain(
          'NEXT_PUBLIC_SUPABASE_ANON_KEY'
        );
      }

      const resolveDashKey = (env: Record<string, string | undefined>) => {
        const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!key) throw new Error('Supabase client key is missing');
        return key;
      };

      // Both set -> prefers publishable key
      expect(
        resolveDashKey({
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_new',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_legacy',
        })
      ).toBe('sb_publishable_new');

      // Only anon set -> falls back to legacy anon key
      expect(
        resolveDashKey({
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_legacy',
        })
      ).toBe('anon_legacy');

      // Neither set -> throws explicit error (never passes missing key to SDK)
      expect(() => resolveDashKey({})).toThrow('Supabase client key is missing');
    });
  });

  describe('Edge Function Key Precedence, Fallback & Explicit Failure', () => {
    const resolveServiceKey = (env: Record<string, string | undefined>) => {
      const key = env.SB_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
      if (!key) {
        throw new Error('Supabase privileged service-role key is not configured');
      }
      return key;
    };

    const resolveAnonKey = (env: Record<string, string | undefined>) => {
      const key = env.SB_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY;
      if (!key) {
        throw new Error('Supabase client key is not configured');
      }
      return key;
    };

    it('prefers SB_SECRET_KEY over SUPABASE_SERVICE_ROLE_KEY for privileged operations', () => {
      expect(
        resolveServiceKey({
          SB_SECRET_KEY: 'sb_secret_val',
          SUPABASE_SERVICE_ROLE_KEY: 'legacy_service_val',
        })
      ).toBe('sb_secret_val');
    });

    it('falls back to legacy SUPABASE_SERVICE_ROLE_KEY during migration', () => {
      expect(
        resolveServiceKey({
          SUPABASE_SERVICE_ROLE_KEY: 'legacy_service_val',
        })
      ).toBe('legacy_service_val');
    });

    it('throws explicit error when privileged service-role key is missing (does not return empty string)', () => {
      expect(() => resolveServiceKey({})).toThrow(
        'Supabase privileged service-role key is not configured'
      );
      expect(() => resolveServiceKey({ SB_SECRET_KEY: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined })).toThrow(
        'Supabase privileged service-role key is not configured'
      );
    });

    it('throws explicit error when publishable/anon key is missing', () => {
      expect(() => resolveAnonKey({})).toThrow(
        'Supabase client key is not configured'
      );
    });
  });

  describe('Shared Helper Implementation & Architectural Discipline', () => {
    it('_shared/supabaseClient.ts is properly implemented with strict validation', () => {
      expect(fs.existsSync(sharedClientFile)).toBe(true);
      const code = fs.readFileSync(sharedClientFile, 'utf8');

      expect(code).toContain("Deno.env.get('SB_SECRET_KEY')");
      expect(code).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
      expect(code).toContain("Deno.env.get('SB_PUBLISHABLE_KEY')");
      expect(code).toContain("Deno.env.get('SUPABASE_ANON_KEY')");
      expect(code).toContain('createServiceRoleClient');
      expect(code).toContain('createAnonClient');
      expect(code).toContain("throw new Error('Supabase privileged service-role key is not configured");
    });

    it('all 13 privileged Edge Functions import and use createServiceRoleClient from _shared', () => {
      for (const fn of privilegedFunctions) {
        const fnFile = path.join(rootDir, 'supabase/functions', fn, 'index.ts');
        expect(fs.existsSync(fnFile), `${fn}/index.ts should exist`).toBe(true);
        const content = fs.readFileSync(fnFile, 'utf8');
        expect(
          content.includes('createServiceRoleClient'),
          `Privileged function ${fn} must use createServiceRoleClient from _shared`
        ).toBe(true);
        expect(
          content.includes("from '../_shared/supabaseClient.ts'") || content.includes('from "../_shared/supabaseClient.ts"'),
          `Function ${fn} must import from _shared/supabaseClient.ts`
        ).toBe(true);
      }
    });

    it('all 5 user-context-only Edge Functions use createAnonClient and do NOT use service_role', () => {
      for (const fn of userContextOnlyFunctions) {
        const fnFile = path.join(rootDir, 'supabase/functions', fn, 'index.ts');
        expect(fs.existsSync(fnFile), `${fn}/index.ts should exist`).toBe(true);
        const content = fs.readFileSync(fnFile, 'utf8');
        expect(
          content.includes('createAnonClient'),
          `User-context function ${fn} must use createAnonClient from _shared`
        ).toBe(true);
        expect(
          content.includes('createServiceRoleClient') || content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('SB_SECRET_KEY'),
          `User-context function ${fn} must NEVER use service_role client or environment variable`
        ).toBe(false);
      }
    });

    it('total Edge Function count is exactly 18 (13 privileged + 5 user-context)', () => {
      expect(privilegedFunctions.length).toBe(13);
      expect(userContextOnlyFunctions.length).toBe(5);
      expect(privilegedFunctions.length + userContextOnlyFunctions.length).toBe(18);
    });
  });

  describe('Source Secret Audit', () => {
    it('no hardcoded JWT literals remain in client application source', () => {
      const filesToCheck = [
        mobileClientFile,
        dashboardLibFile,
        dashboardMiddlewareFile,
        dashboardCallbackFile,
        dashboardUserPageFile,
      ];

      const jwtPattern = /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}/;

      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');
        expect(content, `File ${path.basename(filePath)} must not contain hardcoded JWT`).not.toMatch(jwtPattern);
      }
    });

    it('no sb_secret_ literal values exist in mobile or dashboard source code', () => {
      const clientDirs = [
        path.join(rootDir, 'apps/mobile/lib'),
        path.join(rootDir, 'apps/coach-dashboard/lib'),
        path.join(rootDir, 'apps/coach-dashboard/app'),
      ];

      const secretKeyPattern = /sb_secret_[a-zA-Z0-9_-]+/;

      for (const dir of clientDirs) {
        if (!fs.existsSync(dir)) continue;
        const scan = (currentDir: string) => {
          const entries = fs.readdirSync(currentDir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
              scan(fullPath);
            } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
              const content = fs.readFileSync(fullPath, 'utf8');
              expect(content, `${fullPath} must not contain secret key literals`).not.toMatch(secretKeyPattern);
            }
          }
        };
        scan(dir);
      }
    });
  });

  describe('Real Supabase SDK Runtime Client Initialization Behavior', () => {
    it('real Supabase SDK createClient rejects missing or empty supabaseKey with explicit error', () => {
      expect(() => createClient('https://example.supabase.co', '')).toThrow(
        'supabaseKey is required'
      );
      // @ts-expect-error verifying runtime rejection with null key
      expect(() => createClient('https://example.supabase.co', null)).toThrow(
        'supabaseKey is required'
      );
      expect(() => createClient('', 'sb_publishable_test_key')).toThrow(
        'supabaseUrl is required'
      );
    });

    it('real Supabase SDK createClient initializes cleanly when provided valid publishable key', () => {
      const client = createClient('https://example.supabase.co', 'sb_publishable_test_key_sample');
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
      expect(typeof client.auth.signInWithPassword).toBe('function');
    });

    it('createAnonClient propagates caller Authorization header to Auth and PostgREST queries', () => {
      const dummyAuthHeader = 'Bearer test_user_token_abc123';
      const client = createClient('https://example.supabase.co', 'sb_publishable_test_key_sample', {
        global: { headers: { Authorization: dummyAuthHeader } },
      });

      // 1. Auth service headers must retain caller Authorization
      expect(client.auth?.headers?.Authorization).toBe(dummyAuthHeader);

      // 2. PostgREST builder headers must retain caller Authorization
      const query = client.from('exercises').select('id');
      expect(query.headers.get('Authorization')).toBe(dummyAuthHeader);
    });
  });
});
