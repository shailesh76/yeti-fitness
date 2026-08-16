export interface SystemErrorRow {
  id: string;
  error_type: string | null;
  message: string;
  platform: string | null;
  created_at: string;
}

export interface AiHealthPayload {
  total: number;
  success: number;
  failed: number;
  recentFailures?: Array<{ id: string; error_reason: string | null; provider: string | null; requested_at: string }>;
}

export function summarizeHealth(errorCount: number, ai: AiHealthPayload) {
  return {
    recentErrors: errorCount,
    aiRequests: ai.total,
    aiSuccessRate: ai.total > 0 ? Math.round((ai.success / ai.total) * 1000) / 10 : null,
    aiFailures: ai.failed,
  };
}
