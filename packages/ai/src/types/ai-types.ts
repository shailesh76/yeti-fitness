export type AIProviderName = 'openai' | 'anthropic' | 'gemini';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIContext {
  goal: string;
  weight: number;
  training_experience: string;
  recent_workouts: any[];
  strength_progress: any[];
  nutrition_adherence: number;
  recovery_score: number;
}
