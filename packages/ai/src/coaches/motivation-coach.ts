import { AIClient } from '../core/ai-client';
import { AIContext } from '../types/ai-types';

export class MotivationCoach {
  private client: AIClient;

  constructor(client: AIClient) {
    this.client = client;
  }

  async getAdvice(context: AIContext, userMessage: string): Promise<string> {
    const systemPrompt = `You are the Yeti AI Motivation Coach.
Provide highly motivating, hype-focused responses based on their recent progress.
Be energetic and encouraging.

User Context:
Goal: ${context.goal}`;

    return await this.client.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]);
  }
}
