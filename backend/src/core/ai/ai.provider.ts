/**
 * AI Provider Interface
 * Defines the contract for all AI service providers
 */

export interface AIConfig {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  model?: string;
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IAIProvider {
  /**
   * Generate text content from a prompt
   */
  generateContent(prompt: string, config?: AIConfig): Promise<AIResponse>;

  /**
   * Generate and parse JSON response
   */
  generateJSON<T>(prompt: string, config?: AIConfig): Promise<T>;

  /**
   * Check if the provider is available and configured
   */
  isAvailable(): boolean;

  /**
   * Get provider name for logging
   */
  getProviderName(): string;
}
