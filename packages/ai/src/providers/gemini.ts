import { AIProvider, AIMessage, AIRequestOptions } from '../core/ai-client';

export class GeminiAdapter implements AIProvider {
  name = 'gemini' as const;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(messages: AIMessage[], options?: AIRequestOptions): Promise<string> {
    // Map standard roles to Gemini roles
    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${options?.model || 'gemini-1.5-pro'}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.candidates[0].content.parts[0].text;
  }
}
