// Redacts values that must never be persisted or logged from provider error
// text: API keys, bearer tokens, emails, UUIDs, and generic long token-like
// runs. Order matters — specific patterns first, generic catch-all last, so
// an already-redacted placeholder is never re-matched by the broader pattern.
const REDACTED = '[REDACTED]';

const SPECIFIC_PATTERNS: RegExp[] = [
  /AIza[0-9A-Za-z_-]{35}/g, // Google API key
  /sk-[A-Za-z0-9]{20,}/g, // OpenAI-style key
  /gsk_[A-Za-z0-9]{20,}/g, // Groq-style key
  /Bearer\s+[A-Za-z0-9._-]+/gi, // bearer tokens
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, // emails
  /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, // UUIDs
  /[?&]key=[^&\s"']+/gi, // "key=" query params (e.g. leaked into an echoed URL)
];

// Generic catch-all for standalone long alphanumeric runs (tokens/secrets we
// didn't already recognise by shape). 32+ chars keeps ordinary error prose —
// field paths, error names — from being redacted as a false positive.
const GENERIC_LONG_TOKEN = /\b[A-Za-z0-9_-]{32,}\b/g;

export function redactSensitive(text: string): string {
  let out = text;
  for (const pattern of SPECIFIC_PATTERNS) out = out.replace(pattern, REDACTED);
  out = out.replace(GENERIC_LONG_TOKEN, REDACTED);
  return out;
}
