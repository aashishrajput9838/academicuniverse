import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'mail_explorer',
  moduleName: 'Mail Intelligence',
  description: 'Processes and categorizes Gmail messages for actionable insights.',
  acceptedDocumentCategories: ['OTHER'],
  requiredEntities: ['emails', 'attachments', 'metadata'],
  requiredCandidateFields: ['emails', 'attachments', 'metadata'],
  canonicalCollection: 'KnowledgeRecord',
  priority: 14,
  eventName: 'MailIntelligenceUpdated',
};

export default config;
