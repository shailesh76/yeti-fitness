import { AIClient } from '../core/ai-client';
import { AIContext } from '../types/ai-types';

export class WorkoutCoach {
  private client: AIClient;

  constructor(client: AIClient) {
    this.client = client;
  }

  async getAdvice(context: AIContext, userMessage: string): Promise<string> {
    const systemPrompt = `You are the Yeti AI Workout Coach.
Your goal is to optimize the user's training based on their data.
Do NOT diagnose medical conditions. If pain is reported, advise seeking professional medical help.

User Context:
Goal: ${context.goal}
Experience: ${context.training_experience}
Recent Volume Trend: ${JSON.stringify(context.recent_workouts)}

Provide concise, actionable adjustments for their workout based on their message.`;

    return await this.client.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]);
  }
}
