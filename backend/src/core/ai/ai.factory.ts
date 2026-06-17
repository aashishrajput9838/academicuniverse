/**
 * AI Provider Factory
 * Creates AI provider instances based on configuration
 */

import { IAIProvider } from './ai.provider';
import { GeminiAIProvider } from './gemini.provider';
import { MockAIProvider } from './mock.provider';
import { Logger } from '../../shared/utils';

const logger = new Logger('AIProviderFactory');

export type AIProviderType = 'gemini' | 'openai' | 'mock';

export class AIProviderFactory {
  private static instance: AIProviderFactory;
  private providers: Map<AIProviderType, IAIProvider> = new Map();
  private mockProvider: MockAIProvider | null = null;

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

    // Initialize mock provider as fallback
    this.mockProvider = new MockAIProvider();

    // TODO: Add OpenAI provider when needed
    // const openaiProvider = new OpenAIProvider();
    // if (openaiProvider.isAvailable()) {
    //   this.providers.set('openai', openaiProvider);
    // }

    logger.info(`AI Providers initialized: ${Array.from(this.providers.keys()).join(', ')}`);
  }

  /**
   * Get provider by type (with mock fallback)
   */
  getProvider(type: AIProviderType = 'gemini'): IAIProvider {
    // Always return mock if real provider not available
    const provider = this.providers.get(type);
    if (provider) {
      return provider;
    }
    logger.warn(`Requested AI provider '${type}' not available, falling back to mock`);
    if (!this.mockProvider) {
      this.mockProvider = new MockAIProvider();
    }
    return this.mockProvider;
  }

  /**
   * Get the default/first available provider (with mock fallback)
   */
  getDefaultProvider(): IAIProvider {
    // Return first real provider if available
    if (this.providers.size > 0) {
      const first = this.providers.values().next().value;
      if (first) return first;
    }
    
    // Fall back to mock provider
    logger.warn('No real AI providers available, using mock provider');
    if (!this.mockProvider) {
      this.mockProvider = new MockAIProvider();
    }
    return this.mockProvider;
  }

  /**
   * Check if any real provider is available
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

// Export default provider instance for convenience (always available)
export const aiProvider = AIProviderFactory.getInstance().getDefaultProvider();
