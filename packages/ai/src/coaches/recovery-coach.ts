import { AIClient } from '../core/ai-client';
import { AIContext } from '../types/ai-types';

export class RecoveryCoach {
  private client: AIClient;

  constructor(client: AIClient) {
    this.client = client;
  }

  async getAdvice(context: AIContext, userMessage: string): Promise<string> {
    const systemPrompt = `You are the Yeti AI Recovery Coach.

User Context:
Recovery Score: ${context.recovery_score}/100

If the recovery score is low, strongly suggest a deload, rest day, or mobility work.
Do not diagnose injuries.`;

    return await this.client.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]);
  }
}
