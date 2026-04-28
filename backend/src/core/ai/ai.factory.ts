/**
 * AI Provider Factory
 * Creates AI provider instances based on configuration
 */

import { IAIProvider } from './ai.provider';
import { GeminiAIProvider } from './gemini.provider';
import { Logger } from '../../shared/utils';

const logger = new Logger('AIProviderFactory');

export type AIProviderType = 'gemini' | 'openai' | 'mock';

export class AIProviderFactory {
  private static instance: AIProviderFactory;
  private providers: Map<AIProviderType, IAIProvider> = new Map();

  private constructor() {
    this.initializeProviders();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AIProviderFactory {
    if (!AIProviderFactory.instance) {
      AIProviderFactory.instance = new AIProviderFactory();
    }
    return AIProviderFactory.instance;
  }

  /**
   * Initialize available providers
   */
  private initializeProviders(): void {
    // Initialize Gemini
    const geminiProvider = new GeminiAIProvider();
    if (geminiProvider.isAvailable()) {
      this.providers.set('gemini', geminiProvider);
      logger.info('Gemini AI provider registered');
    }

    // TODO: Add OpenAI provider when needed
    // const openaiProvider = new OpenAIProvider();
    // if (openaiProvider.isAvailable()) {
    //   this.providers.set('openai', openaiProvider);
    // }

    logger.info(`AI Providers initialized: ${Array.from(this.providers.keys()).join(', ')}`);
  }

  /**
   * Get provider by type
   */
  getProvider(type: AIProviderType = 'gemini'): IAIProvider {
    const provider = this.providers.get(type);
    
    if (!provider) {
      throw new Error(`AI provider '${type}' is not available`);
    }

    return provider;
  }

  /**
   * Get the default/first available provider
   */
  getDefaultProvider(): IAIProvider {
    if (this.providers.size === 0) {
      throw new Error('No AI providers are available');
    }

    // Return first available provider
    return this.providers.values().next().value;
  }

  /**
   * Check if any provider is available
   */
  hasAvailableProvider(): boolean {
    return this.providers.size > 0;
  }

  /**
   * List available providers
   */
  getAvailableProviders(): AIProviderType[] {
    return Array.from(this.providers.keys());
  }
}

// Export default provider instance for convenience
export const aiProvider = AIProviderFactory.getInstance().getDefaultProvider();
