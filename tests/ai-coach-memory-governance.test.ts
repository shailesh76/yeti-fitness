import { describe, it, expect } from 'vitest';
import { foldMemoryRows, sanitizeSummarySensitivity, isSummaryFresh } from '../supabase/functions/_shared/ai/coachMemory.ts';

describe('AI Coach Memory Governance & Sensitivity', () => {
  it('1. sanitizes sensitive items (medical red flags, emails, phone numbers) from summary text', () => {
    const rawText = 'Athlete reported chest pain and fainting during leg press. Contact athlete at athlete@example.com or 555-123-4567.';
    const sanitized = sanitizeSummarySensitivity(rawText);

    expect(sanitized).not.toContain('chest pain');
    expect(sanitized).not.toContain('fainting');
    expect(sanitized).not.toContain('athlete@example.com');
    expect(sanitized).not.toContain('555-123-4567');
    expect(sanitized).toContain('[medical_redacted]');
    expect(sanitized).toContain('[email_redacted]');
    expect(sanitized).toContain('[phone_redacted]');
  });

  it('2. filters out expired session summaries older than 30 days', () => {
    const freshSummary = '2026-08-01: 90% adherence, 2 PRs.';
    const staleSummary = '2026-06-01: 50% adherence.';

    expect(isSummaryFresh(freshSummary, 30)).toBe(true);
    expect(isSummaryFresh(staleSummary, 30)).toBe(false);
  });

  it('3. enforces maximum retained summaries cap of 3 in foldMemoryRows', () => {
    const rows = [
      { category: 'coaching observations', memory_key: 'session_summary_conv1_turn1', memory_value: '[session_summary] 2026-08-01: 90% adherence.' },
      { category: 'coaching observations', memory_key: 'session_summary_conv1_turn2', memory_value: '[session_summary] 2026-08-02: 95% adherence.' },
      { category: 'coaching observations', memory_key: 'session_summary_conv1_turn3', memory_value: '[session_summary] 2026-08-03: 100% adherence.' },
      { category: 'coaching observations', memory_key: 'session_summary_conv1_turn4', memory_value: '[session_summary] 2026-08-04: 85% adherence.' },
    ];

    const folded = foldMemoryRows(rows);
    expect(folded.coachingSummaries).toBeDefined();
    expect(folded.coachingSummaries?.length).toBe(3);
  });
});
