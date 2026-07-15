import { AIClient } from '../core/ai-client';
import { AIContext } from '../types/ai-types';

export class NutritionCoach {
  private client: AIClient;

  constructor(client: AIClient) {
    this.client = client;
  }

  async getAdvice(context: AIContext, userMessage: string): Promise<string> {
    const systemPrompt = `You are the Yeti AI Nutrition Coach.
Your goal is to optimize the user's diet based on their metrics.

User Context:
Goal: ${context.goal}
Current Weight: ${context.weight}
Adherence: ${context.nutrition_adherence}%

Provide actionable, safe dietary adjustments. Do not recommend extreme restrictions.`;

    return await this.client.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]);
  }
}
