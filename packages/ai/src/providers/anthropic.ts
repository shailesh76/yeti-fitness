import { AIProvider, AIMessage, AIRequestOptions } from '../core/ai-client';

export class AnthropicAdapter implements AIProvider {
  name = 'anthropic' as const;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(messages: AIMessage[], options?: AIRequestOptions): Promise<string> {
    // Anthropic formatting handles roles slightly differently (system is separated)
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options?.model || 'claude-3-opus-20240229',
        system: systemMessage,
        messages: userMessages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1024
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.content[0].text;
  }
}
