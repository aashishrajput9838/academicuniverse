/**
 * Gemini AI Provider Implementation
 * Implements IAIProvider using Google's Gemini API
 */

import { GoogleGenAI } from '@google/genai';
import { IAIProvider, AIConfig, AIResponse } from './ai.provider';
import { Logger } from '../../shared/utils';

const logger = new Logger('GeminiAIProvider');

export class GeminiAIProvider implements IAIProvider {
  private ai: GoogleGenAI | null = null;
  private defaultModel: string = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      logger.warn('GEMINI_API_KEY is not set or using placeholder. AI features will be limited.');
      return;
    }

    try {
      this.ai = new GoogleGenAI({ apiKey });
      logger.info('Google Gemini client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Gemini AI client:', error);
    }
  }

  /**
   * Check if Gemini is available
   */
  isAvailable(): boolean {
    return this.ai !== null;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'Google Gemini';
  }

  /**
   * Generate content from prompt
   */
  async generateContent(prompt: string, config?: AIConfig): Promise<AIResponse> {
    if (!this.ai) {
      throw new Error('Gemini AI provider is not initialized');
    }

    try {
      const model = config?.model || this.defaultModel;
      const temperature = config?.temperature ?? 0.7;
      const maxTokens = config?.maxTokens ?? 500;

      const response = await this.ai.models.generateContent({
        model,
        contents: config?.systemInstruction 
          ? `${config.systemInstruction}\n\n${prompt}`
          : prompt,
        config: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      });

      return {
        text: response.text || '',
        usage: {
          promptTokens: 0, // Gemini doesn't expose token usage in this version
          completionTokens: 0,
          totalTokens: 0,
        }
      };
    } catch (error: any) {
      logger.error('Error calling Gemini API:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Generate and parse JSON response
   */
  async generateJSON<T>(prompt: string, config?: AIConfig): Promise<T> {
    const response = await this.generateContent(prompt, {
      ...config,
      temperature: config?.temperature ?? 0.3, // Lower temp for JSON
    });

    return this.parseJSON<T>(response.text);
  }

  /**
   * Parse JSON from AI response (handles markdown code blocks)
   */
  private parseJSON<T>(rawText: string): T {
    let cleanJson = rawText.trim();
    
    // Remove markdown code blocks if present
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```/g, '').trim();
    }

    try {
      return JSON.parse(cleanJson) as T;
    } catch (error) {
      logger.error('Failed to parse JSON from AI response:', { rawText, error });
      throw new Error('Invalid JSON response from AI');
    }
  }
}
