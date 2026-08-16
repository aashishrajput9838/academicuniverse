/**
 * OllamaAIProvider.ts
 *
 * Local-First Vision AI Provider for unlimited, quota-free, reproducible research benchmarking.
 * Connects to Ollama REST API (http://localhost:11434) supporting models such as:
 * - qwen2.5-vl
 * - llava
 * - minicpm-v
 * - gemma3
 */

import axios from 'axios';
import { IAIProvider, AIConfig, AIResponse } from './ai.provider';

export class OllamaAIProvider implements IAIProvider {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_VISION_MODEL || 'qwen2.5-vl';
  }

  getProviderName(): string {
    return `Ollama Local (${this.model})`;
  }

  isAvailable(): boolean {
    return Boolean(process.env.OLLAMA_ENABLED === 'true' || process.env.OLLAMA_BASE_URL);
  }

  async generateContent(prompt: string, config: AIConfig = {}): Promise<AIResponse> {
    const activeModel = config.model || this.model;
    const messages: any[] = [];
    if (config.systemInstruction) {
      messages.push({ role: 'system', content: config.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await axios.post(`${this.baseUrl}/api/chat`, {
      model: activeModel,
      messages,
      stream: false,
      options: {
        temperature: config.temperature ?? 0.1,
      },
    }, { timeout: 120000 });

    const text = res.data?.message?.content || '';
    return {
      text,
      rawResponse: res.data,
    };
  }

  async generateJSON<T = any>(prompt: string, config: AIConfig = {}): Promise<T> {
    const activeModel = config.model || this.model;
    const messages: any[] = [];
    if (config.systemInstruction) {
      messages.push({ role: 'system', content: config.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await axios.post(`${this.baseUrl}/api/chat`, {
      model: activeModel,
      messages,
      format: 'json',
      stream: false,
      options: {
        temperature: config.temperature ?? 0.1,
      },
    }, { timeout: 120000 });

    const content = res.data?.message?.content;
    if (!content) {
      throw new Error('[OllamaAIProvider] Empty response from Ollama chat API.');
    }
    return JSON.parse(content) as T;
  }

  /**
   * Generate JSON from multimodal Base64 image input
   */
  async generateVisionJSON<T = any>(
    prompt: string,
    imageBase64: string,
    mimeType: string = 'image/png',
    config: AIConfig = {}
  ): Promise<T> {
    const activeModel = config.model || this.model;

    // Fast image optimization using sharp (resize max 1024px to speed up CPU inference by 5x-10x)
    let processedBase64 = imageBase64;
    try {
      const sharp = require('sharp');
      const imgBuffer = Buffer.from(imageBase64, 'base64');
      const resizedBuffer = await sharp(imgBuffer)
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      processedBase64 = resizedBuffer.toString('base64');
    } catch (resizeErr) {
      // fallback to original if sharp error
    }

    const messages: any[] = [];
    if (config.systemInstruction) {
      messages.push({ role: 'system', content: config.systemInstruction });
    }
    messages.push({
      role: 'user',
      content: prompt,
      images: [processedBase64],
    });

    const res = await axios.post(`${this.baseUrl}/api/chat`, {
      model: activeModel,
      messages,
      stream: false,
      options: {
        temperature: config.temperature ?? 0.1,
      },
    }, { timeout: 300000 });

    const content = res.data?.message?.content;
    if (!content) {
      throw new Error('[OllamaAIProvider] Empty vision response from Ollama API.');
    }
    return JSON.parse(content) as T;
  }
}
