import { describe, it, expect } from 'vitest';
import { redactSensitive } from '../supabase/functions/_shared/ai/errorSanitizer.ts';

describe('redactSensitive', () => {
  it('redacts a Google API key', () => {
    expect(redactSensitive('key AIzaSyD-fake1234567890fakefake1234567 is invalid')).not.toMatch(/AIzaSy/);
  });

  it('redacts an OpenAI-style key', () => {
    expect(redactSensitive('using sk-abcdefghijklmnopqrstuvwxyz123456')).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
  });

  it('redacts a Groq-style key', () => {
    expect(redactSensitive('token gsk_abcdefghijklmnopqrstuvwxyz1234')).not.toMatch(/gsk_[A-Za-z0-9]{20,}/);
  });

  it('redacts a bearer token', () => {
    expect(redactSensitive('Authorization: Bearer abc123.def456-ghi789')).not.toMatch(/Bearer\s+\S+/);
  });

  it('redacts an email address', () => {
    expect(redactSensitive('contact admin@example.com for help')).not.toContain('admin@example.com');
  });

  it('redacts a UUID', () => {
    expect(redactSensitive('athlete 4075e9bf-7dab-4809-8fc3-6670315b0965 not found')).not.toContain('4075e9bf-7dab-4809-8fc3-6670315b0965');
  });

  it('redacts a "key=" query parameter', () => {
    expect(redactSensitive('GET /v1beta/models?key=AbCdEf123456 failed')).not.toContain('key=AbCdEf123456');
  });

  it('redacts a generic long token-like run (32+ chars) not matching a known key shape', () => {
    expect(redactSensitive(`session ${'a'.repeat(40)} expired`)).not.toContain('a'.repeat(40));
  });

  it('does not redact ordinary error prose or short field-name-like tokens', () => {
    const msg = 'Invalid JSON payload received. Unknown name "response_schema" at generation_config.';
    expect(redactSensitive(msg)).toBe(msg);
  });

  it('leaves an already-redacted placeholder alone (no double-processing artifacts)', () => {
    const once = redactSensitive('key AIzaSyD-fake1234567890fakefake1234567 here');
    expect(redactSensitive(once)).toBe(once);
  });
});
