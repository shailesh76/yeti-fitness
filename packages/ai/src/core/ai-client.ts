import { AIMessage, AIProviderName, AIRequestOptions } from '../types/ai-types';
export { AIMessage, AIProviderName, AIRequestOptions };

export interface AIProvider {
  name: AIProviderName;
  generateResponse(messages: AIMessage[], options?: AIRequestOptions): Promise<string>;
}

export class AIClient {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  setProvider(provider: AIProvider) {
    this.provider = provider;
  }

  async chat(messages: AIMessage[], options?: AIRequestOptions): Promise<string> {
    return await this.provider.generateResponse(messages, options);
  }
}
