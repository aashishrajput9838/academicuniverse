/**
 * ModuleRegistry
 *
 * Auto-discovers module descriptors from the module-registry directory.
 * Provides a single source of truth for all Academic Universe modules
 * that can receive routed data from the UAIP pipeline.
 *
 * Adding a new module requires only adding a new *.config.ts file
 * in backend/src/shared/application/module-registry/.
 */

import { ModuleDescriptor, IModuleAdapter } from './moduleRegistry.types';
import { moduleConfigs } from './module-registry';

export type { ModuleDescriptor, IModuleAdapter } from './moduleRegistry.types';

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private readonly modules: Map<string, ModuleDescriptor> = new Map();

  private constructor() {
    this.buildRegistry();
  }

  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  private buildRegistry(): void {
    for (const config of moduleConfigs) {
      if (config && config.moduleId) {
        this.modules.set(config.moduleId, config);
      }
    }
  }

  getAll(): ModuleDescriptor[] {
    return Array.from(this.modules.values()).sort((a, b) => a.priority - b.priority);
  }

  getById(moduleId: string): ModuleDescriptor | undefined {
    return this.modules.get(moduleId);
  }

  getByCategory(category: string): ModuleDescriptor[] {
    return this.getAll().filter(m => m.acceptedDocumentCategories.includes(category));
  }

  getPrimaryModuleForCategory(category: string): ModuleDescriptor | undefined {
    const matches = this.getByCategory(category);
    if (matches.length === 0) return undefined;
    return matches.sort((a, b) => a.priority - b.priority)[0];
  }
}
