/**
 * Mock AI Provider Implementation
 * Fallback provider when no real AI providers are available
 */

import { IAIProvider, AIConfig, AIResponse } from './ai.provider';
import { Logger } from '../../shared/utils';

const logger = new Logger('MockAIProvider');

export class MockAIProvider implements IAIProvider {
  private responseCounter = 0;

  constructor() {
    logger.info('Mock AI provider initialized (for development only)');
  }

  /**
   * Check if mock is available (always true)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'Mock AI Provider';
  }

  /**
   * Generate mock content from prompt
   */
  async generateContent(prompt: string, config?: AIConfig): Promise<AIResponse> {
    logger.warn('Using mock AI response (no real API key configured)');
    
    // Simple mock responses based on prompt keywords
    this.responseCounter++;
    
    return {
      text: `This is a mock AI response #${this.responseCounter} for prompt: ${prompt.substring(0, 50)}...`,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      }
    };
  }

  /**
   * Generate mock JSON from prompt
   */
  async generateJSON<T>(prompt: string, config?: AIConfig): Promise<T> {
    logger.warn('Using mock JSON AI response (no real API key configured)');
    
    this.responseCounter++;
    
    // Simple mock JSON responses based on prompt keywords
    if (prompt.includes('topic') || prompt.includes('research')) {
      return [
        "Mock Research Topic 1",
        "Mock Research Topic 2",
        "Mock Research Topic 3"
      ] as unknown as T;
    }
    
    if (prompt.includes('outline') || prompt.includes('structure')) {
      return {
        sections: [
          "Introduction",
          "Literature Review",
          "Methodology",
          "Results",
          "Conclusion"
        ]
      } as unknown as T;
    }
    
    // Default mock JSON
    return {
      message: "Mock JSON response",
      timestamp: new Date().toISOString(),
      counter: this.responseCounter
    } as unknown as T;
  }
}
