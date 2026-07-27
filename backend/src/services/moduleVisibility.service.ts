import { ModuleVisibility, IModuleVisibility } from '../models/ModuleVisibility';
import { Logger } from '../utils/logger';

const logger = new Logger('ModuleVisibilityService');

export interface ModuleVisibilityConfig {
  key: string;
  name: string;
  description?: string;
  category: string;
  isEnabled?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
}

class ModuleVisibilityService {
  private cache: Map<string, IModuleVisibility> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000;
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.reloadCache();
    this.initialized = true;
  }

  async reloadCache(): Promise<void> {
    try {
      const entries = await ModuleVisibility.find({}).lean().exec();
      this.cache.clear();
      for (const entry of entries) {
        this.cache.set(entry.key, entry as IModuleVisibility);
      }
      this.cacheTimestamp = Date.now();
      logger.info(`Module visibility cache reloaded: ${this.cache.size} modules`);
    } catch (error: any) {
      logger.error('Failed to reload module visibility cache:', error);
    }
  }

  async isModuleEnabled(moduleKey: string): Promise<boolean> {
    const entry = this.cache.get(moduleKey);
    if (!entry) return true;
    return entry.isEnabled && entry.isVisible;
  }

  async isModuleVisible(moduleKey: string): Promise<boolean> {
    const entry = this.cache.get(moduleKey);
    if (!entry) return true;
    return entry.isVisible;
  }

  async getAllModules(): Promise<IModuleVisibility[]> {
    await this.ensureCacheFresh();
    return Array.from(this.cache.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getModule(moduleKey: string): Promise<IModuleVisibility | null> {
    await this.ensureCacheFresh();
    return this.cache.get(moduleKey) || null;
  }

  async setModuleEnabled(moduleKey: string, isEnabled: boolean): Promise<void> {
    await ModuleVisibility.findOneAndUpdate(
      { key: moduleKey },
      { isEnabled, updatedAt: new Date() },
      { new: true }
    ).exec();
    await this.reloadCache();
  }

  async setModuleVisible(moduleKey: string, isVisible: boolean): Promise<void> {
    await ModuleVisibility.findOneAndUpdate(
      { key: moduleKey },
      { isVisible, updatedAt: new Date() },
      { new: true }
    ).exec();
    await this.reloadCache();
  }

  async updateModule(
    moduleKey: string,
    updates: Partial<Pick<IModuleVisibility, 'name' | 'description' | 'category' | 'isEnabled' | 'isVisible' | 'sortOrder'>>
  ): Promise<IModuleVisibility | null> {
    const updated = await ModuleVisibility.findOneAndUpdate(
      { key: moduleKey },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).exec();
    if (updated) {
      this.cache.set(moduleKey, updated);
    }
    return updated;
  }

  async registerModule(config: ModuleVisibilityConfig): Promise<IModuleVisibility> {
    const module = await ModuleVisibility.findOneAndUpdate(
      { key: config.key },
      {
        ...config,
        updatedAt: new Date(),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec();
    this.cache.set(module.key, module);
    return module;
  }

  async registerModules(modules: ModuleVisibilityConfig[]): Promise<void> {
    for (const config of modules) {
      await this.registerModule(config);
    }
  }

  async ensureCacheFresh(): Promise<void> {
    if (this.cache.size === 0 || Date.now() - this.cacheTimestamp > this.CACHE_TTL) {
      await this.reloadCache();
    }
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const moduleVisibilityService = new ModuleVisibilityService();
