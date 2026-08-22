// Client-side AI error sanitizer and normalization boundary.
// Guarantees athletes never see raw provider names, model IDs, HTTP statuses,
// upstream JSON, fallback reasons, stack traces, or database errors.

const TECHNICAL_ERROR_PATTERNS: RegExp[] = [
  /\b(gemini|groq|openai|anthropic|openrouter|deepseek|mistral|ollama|cohere)\b/i,
  /\b(llama|gpt-oss|gpt-[34]|claude|qwen|allam|dall-e)\b/i,
  /\b(model_not_found|json_validate_failed|resource_exhausted|rate_limit|rate_limited)\b/i,
  /\b(All AI providers failed|AllProvidersFailedError|ProviderHttpError|AINotConfiguredError)\b/i,
  /\b(HTTP\s*\d{3}|\b(400|401|403|404|413|429|500|502|503|504)\b)/i,
  /\b(http(s)?:\/\/|\/v1\/|\/chat\/completions)\b/i,
  /\b(fetch failed|network\s*error|econnrefused|etimedout|enotfound|abort(ed)?)\b/i,
  /\b(syntaxerror|typeerror|referenceerror|rangeerror|evalerror)\b/i,
  /\b(pgrst|postgrest|supabase|postgres|sql|relation|column|database|deadlock)\b/i,
  /\b(stack trace|at\s+\w+\s+\(|file:\/\/\/|\.ts:\d+|\.js:\d+)\b/i,
  /^\s*[\{\[][\s\S]*[\}\]]\s*$/, // raw JSON object/array payload
];

/**
 * Checks whether an error string contains technical/internal implementation details.
 */
export function isTechnicalOrRawError(text: string): boolean {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();
  if (!trimmed) return true;
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Converts any raw error, exception, or server response into a safe,
 * friendly athlete-facing message. Guarantees no provider names, model IDs,
 * status codes, JSON payloads, or stack traces reach the UI.
 */
export function sanitizeAthleteErrorMessage(
  rawError: unknown,
  fallbackMessage = 'AI Coach is temporarily unavailable. Please try again shortly.'
): string {
  let message = '';
  if (typeof rawError === 'string') {
    message = rawError;
  } else if (rawError && typeof rawError === 'object') {
    const err = rawError as any;
    message = err.message || err.error || err.statusText || '';
    if (typeof message !== 'string') message = '';
  }

  const trimmed = message.trim();

  // Known intentional user-facing messages
  if (/daily (food scan|coach|ai) limit reached/i.test(trimmed)) {
    return trimmed;
  }
  if (/exercise not found/i.test(trimmed)) {
    return 'Exercise not found.';
  }
  if (/session has expired|sign in again/i.test(trimmed)) {
    return 'Your session has expired. Please sign in again.';
  }
  if (/AI Coach isn't set up yet/i.test(trimmed)) {
    return trimmed;
  }

  // If the message is missing or matches any technical pattern, return safe fallback
  if (!trimmed || isTechnicalOrRawError(trimmed)) {
    return fallbackMessage;
  }

  return trimmed;
}
