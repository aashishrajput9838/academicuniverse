import axios from 'axios';
import { IAIProvider, AIConfig, AIResponse } from './ai.provider';
import { Logger } from '../../shared/utils';

const logger = new Logger('GroqAIProvider');

export class GroqAIProvider implements IAIProvider {
  private apiKey: string | undefined = process.env.GROQ_API_KEY;
  private model: string = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  private apiUrl: string = 'https://api.groq.com/openai/v1/chat/completions';

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey !== 'your_groq_api_key_here');
  }

  getProviderName(): string {
    return 'Groq Cloud AI';
  }

  async generateJSON<T = any>(prompt: string, config: AIConfig = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('[GroqAIProvider] GROQ_API_KEY is not configured in environment.');
    }

    const messages = [];
    if (config.systemInstruction) {
      messages.push({ role: 'system', content: config.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody = {
      model: config.model || this.model,
      messages,
      temperature: config.temperature ?? 0.1,
      response_format: { type: 'json_object' },
    };

    let attempt = 0;
    const maxRetries = 5;
    while (attempt < maxRetries) {
      try {
        const response = await axios.post(this.apiUrl, requestBody, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        });

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response received from Groq API');
        }

        return JSON.parse(content) as T;
      } catch (err: any) {
        if (err.response?.status === 429 && attempt < maxRetries - 1) {
          attempt++;
          const retryDelay = 2000 * attempt;
          logger.warn(`Groq 429 rate limit hit, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})...`);
          await new Promise((res) => setTimeout(res, retryDelay));
          continue;
        }
        logger.error('Groq API Error:', err.response?.data || err.message);
        throw err;
      }
    }
    throw new Error('[GroqAIProvider] Max retries exceeded.');
  }

  async generateContent(prompt: string, config: AIConfig = {}): Promise<AIResponse> {
    const rawObj = await this.generateJSON<any>(prompt, config);
    return {
      text: typeof rawObj === 'string' ? rawObj : JSON.stringify(rawObj),
      rawResponse: rawObj,
    };
  }
}
