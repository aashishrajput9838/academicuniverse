/**
 * AI Provider Factory
 * Creates AI provider instances based on configuration
 */

import { IAIProvider } from './ai.provider';
import { GeminiAIProvider } from './gemini.provider';
import { OpenRouterAIProvider } from './openrouter.provider';
import { FailoverAIProvider } from './failover.provider';
import { MockAIProvider } from './mock.provider';
import { Logger } from '../../shared/utils';

const logger = new Logger('AIProviderFactory');

export type AIProviderType = 'gemini' | 'openrouter' | 'openai' | 'mock';

export class AIProviderFactory {
  private static instance: AIProviderFactory;
  private providers: Map<AIProviderType, IAIProvider> = new Map();
  private mockProvider: MockAIProvider | null = null;
  private isProduction = process.env.NODE_ENV === 'production';

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
    const geminiProvider = new GeminiAIProvider();
    if (geminiProvider.isAvailable()) {
      this.providers.set('gemini', geminiProvider);
      logger.info('Gemini AI provider registered');
    }

    const openRouterProvider = new OpenRouterAIProvider();
    if (openRouterProvider.isAvailable()) {
      this.providers.set('openrouter', openRouterProvider);
      logger.info('OpenRouter AI provider registered');
    }

    if (!this.isProduction) {
      this.mockProvider = new MockAIProvider();
    }

    logger.info(`AI Providers initialized: ${Array.from(this.providers.keys()).join(', ')}`);
  }

  /**
   * Get provider by type
   */
  getProvider(type: AIProviderType = 'gemini'): IAIProvider {
    logger.info('Provider requested', {
      requestedProvider: type,
      availableProviders: Array.from(this.providers.keys()),
      isProduction: this.isProduction,
    });

    const provider = this.providers.get(type);
    if (provider) {
      logger.info('Selected provider', {
        requestedProvider: type,
        providerName: provider.getProviderName(),
        providerClass: provider.constructor.name,
        isAvailable: provider.isAvailable(),
      });
      return provider;
    }

    if (this.isProduction) {
      logger.error(`Requested AI provider '${type}' is not available in production`);
      throw new Error('No AI provider is currently available. Please try again later.');
    }

    logger.warn(`Requested AI provider '${type}' not available in development`, {
      requestedProvider: type,
      reason: 'Provider not registered or not available',
    });
    if (type === 'openrouter') {
      logger.warn('OpenRouter provider fallback is not permitted in development for explicit openrouter selection');
      throw new Error('OpenRouter provider is not available');
    }

    if (!this.mockProvider) {
      this.mockProvider = new MockAIProvider();
    }

    logger.info('Selected fallback provider', {
      requestedProvider: type,
      selectedProvider: this.mockProvider.getProviderName(),
      providerClass: this.mockProvider.constructor.name,
      isAvailable: this.mockProvider.isAvailable(),
    });
    return this.mockProvider;
  }

  getDefaultProvider(): IAIProvider {
    const gemini = this.providers.get('gemini');
    const openrouter = this.providers.get('openrouter');

    let baseProvider: IAIProvider;
    if (gemini && openrouter) {
      baseProvider = new FailoverAIProvider(gemini, openrouter);
    } else if (gemini) {
      baseProvider = gemini;
    } else if (openrouter) {
      baseProvider = openrouter;
    } else {
      if (this.isProduction) {
        logger.error('No real AI providers available in production; refusing to start without a provider');
        throw new Error('No AI provider is currently available. Please try again later.');
      }
      if (!this.mockProvider) {
        this.mockProvider = new MockAIProvider();
      }
      return this.mockProvider;
    }

    if (!this.isProduction) {
      if (!this.mockProvider) {
        this.mockProvider = new MockAIProvider();
      }
      return new FailoverAIProvider(baseProvider, this.mockProvider);
    }

    return baseProvider;
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

// Export default provider instance for convenience
export const aiProvider = AIProviderFactory.getInstance().getDefaultProvider();
