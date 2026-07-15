export interface JobConfig {
  queueName: string;
  retryLimit?: number;
  timeoutSeconds?: number;
}

export interface JobPayload<T = any> {
  job_id: string;
  data: T;
}

/**
 * Agnostic Job Interface.
 * Allows Yeti to swap underlying providers (Supabase Edge vs Temporal vs AWS SQS) 
 * without modifying domain logic.
 */
export interface JobProvider {
  enqueue(config: JobConfig, payload: JobPayload): Promise<void>;
  process(config: JobConfig, handler: (payload: JobPayload) => Promise<void>): void;
}

export class JobSystem {
  constructor(private provider: JobProvider) {}

  async scheduleNotification(userId: string, type: string) {
    await this.provider.enqueue(
      { queueName: 'notifications', retryLimit: 3 },
      { job_id: `notif_${Date.now()}`, data: { userId, type } }
    );
  }

  async scheduleMediaProcessing(fileId: string) {
    await this.provider.enqueue(
      { queueName: 'media_pipeline', timeoutSeconds: 300 },
      { job_id: `media_${fileId}`, data: { fileId } }
    );
  }
}
