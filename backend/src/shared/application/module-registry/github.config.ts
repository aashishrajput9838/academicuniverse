import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'github',
  moduleName: 'GitHub Analytics',
  description: 'Synchronizes student GitHub contributions, repositories, and language profiles.',
  acceptedDocumentCategories: ['OTHER'],
  requiredEntities: ['repositories', 'languages', 'contributions'],
  requiredCandidateFields: ['repositories', 'languages', 'contributions'],
  canonicalCollection: 'GithubRecord',
  priority: 7,
  eventName: 'GithubUpdated',
};

export default config;
