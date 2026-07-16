/**
 * Module Discovery Configuration
 *
 * Each module in backend/src/modules/ can export a module.config.ts file.
 * The ModuleRegistry will auto-discover these at startup.
 */

export interface ModuleDescriptor {
  moduleId: string;
  moduleName: string;
  description: string;
  acceptedDocumentCategories: string[];
  requiredEntities: string[];
  requiredCandidateFields: string[];
  canonicalCollection: string;
  priority: number;
  adapterPath?: string;
  eventName?: string;
  refreshEndpoint?: string;
}

export interface IModuleAdapter {
  validateData(fields: Record<string, any>): boolean;
  mapCandidateFields(fields: Record<string, any>, kr: any): Record<string, any>;
  populate(
    fields: Record<string, any>,
    kr: any,
    upload: any,
    personId: any,
    session: any,
    reviewer: any,
    populationLog: any
  ): Promise<string[]>;
  rollback(
    processingId: string,
    organizationId: string,
    personId: string,
    session: any
  ): Promise<string[]>;
  healthCheck(): Promise<{ healthy: boolean; message?: string }>;
}
