import { describe, it, expect } from 'vitest';
import {
  sanitizeAthleteErrorMessage as serverSanitize,
  isTechnicalOrRawError as serverIsTechnical,
  redactSensitive,
} from '../supabase/functions/_shared/ai/errorSanitizer';
import {
  sanitizeAthleteErrorMessage as clientSanitize,
  isTechnicalOrRawError as clientIsTechnical,
} from '../apps/mobile/utils/aiErrorSanitizer';

describe('AI Athlete Error Sanitization Boundary', () => {
  const LEAK_CASES = [
    {
      name: 'All AI providers failed error with decommissioned Groq model',
      input: 'All AI providers failed: Gemini 429: RESOURCE_EXHAUSTED, Groq 404: model_not_found llama-3.3-70b-versatile',
    },
    {
      name: 'Direct Groq 404 model_not_found string',
      input: 'Groq 404: model_not_found',
    },
    {
      name: 'Raw model identifier leak',
      input: 'Error generating response from openai/gpt-oss-20b: context length exceeded',
    },
    {
      name: 'Raw upstream JSON payload',
      input: '{"error": {"code": 404, "message": "model_not_found", "type": "invalid_request_error"}}',
    },
    {
      name: 'HTTP status error message',
      input: 'ProviderHttpError: 502 Bad Gateway from upstream AI cluster',
    },
    {
      name: 'Stack trace / runtime TypeError',
      input: 'TypeError: Cannot read properties of undefined (reading text)\n    at generateChat (file:///supabase/functions/_shared/ai/service.ts:145:22)',
    },
    {
      name: 'Database / PostgREST error leak',
      input: 'PostgREST PGRST301: relation ai_request_logs column fallback_reason does not exist',
    },
    {
      name: 'Connection / network failure',
      input: 'fetch failed: ECONNREFUSED 127.0.0.1:443',
    },
  ];

  const FORBIDDEN_TOKENS = [
    /gemini/i,
    /groq/i,
    /openai/i,
    /anthropic/i,
    /llama/i,
    /gpt-oss/i,
    /model_not_found/i,
    /all ai providers failed/i,
    /404/,
    /429/,
    /500/,
    /502/,
    /503/,
    /pgrst/i,
    /postgrest/i,
    /stack trace/i,
    /file:\/\/\//i,
    /\{.*\}/,
  ];

  describe('Server-Side Normalization (supabase/functions/_shared/ai/errorSanitizer.ts)', () => {
    for (const testCase of LEAK_CASES) {
      it(`sanitizes: ${testCase.name}`, () => {
        expect(serverIsTechnical(testCase.input)).toBe(true);

        const sanitized = serverSanitize(testCase.input, 'AI tip is temporarily unavailable. Please try again.');

        expect(sanitized).toBe('AI tip is temporarily unavailable. Please try again.');

        for (const forbidden of FORBIDDEN_TOKENS) {
          expect(forbidden.test(sanitized)).toBe(false);
        }
      });
    }

    it('preserves clean user-facing limit messages', () => {
      const limitMsg = 'Daily food scan limit reached for free tier (max 10 scans/day). Upgrade to Pro for unlimited scans!';
      expect(serverSanitize(limitMsg)).toBe(limitMsg);
    });

    it('preserves clean session expired messages', () => {
      const sessionMsg = 'Your session has expired. Please sign in again.';
      expect(serverSanitize(sessionMsg)).toBe(sessionMsg);
    });

    it('retains full technical details in server-side diagnostics and redaction', () => {
      const technicalLog = 'Groq key gsk_123456789012345678901234567890 failed: model_not_found llama-3.3-70b-versatile';
      const redacted = redactSensitive(technicalLog);
      expect(redacted).toContain('model_not_found');
      expect(redacted).toContain('llama-3.3-70b-versatile');
      expect(redacted).not.toContain('gsk_123456789012345678901234567890');
      expect(redacted).toContain('[REDACTED]');
    });
  });

  describe('Client-Side Normalization (apps/mobile/utils/aiErrorSanitizer.ts)', () => {
    for (const testCase of LEAK_CASES) {
      it(`sanitizes: ${testCase.name}`, () => {
        expect(clientIsTechnical(testCase.input)).toBe(true);

        const sanitized = clientSanitize(testCase.input, 'AI tip is temporarily unavailable. Please try again.');

        expect(sanitized).toBe('AI tip is temporarily unavailable. Please try again.');

        for (const forbidden of FORBIDDEN_TOKENS) {
          expect(forbidden.test(sanitized)).toBe(false);
        }
      });
    }

    it('handles Error objects and structured error shapes', () => {
      const errObj = new Error('Groq 404: model_not_found');
      const sanitized = clientSanitize(errObj, 'AI tip is temporarily unavailable. Please try again.');
      expect(sanitized).toBe('AI tip is temporarily unavailable. Please try again.');
    });

    it('handles JSON object error payloads', () => {
      const errorPayload = { error: 'All AI providers failed: Groq 404', status: 502 };
      const sanitized = clientSanitize(errorPayload, 'AI tip is temporarily unavailable. Please try again.');
      expect(sanitized).toBe('AI tip is temporarily unavailable. Please try again.');
    });
  });
});
