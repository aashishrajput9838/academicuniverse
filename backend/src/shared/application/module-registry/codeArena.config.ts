import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'code_arena',
  moduleName: 'Code Arena',
  description: 'Tracks coding practice, competition performance, and programming skill development.',
  acceptedDocumentCategories: ['OTHER'],
  requiredEntities: ['coding activity', 'competitions', 'languages'],
  requiredCandidateFields: ['codingActivity', 'competitions', 'languages'],
  canonicalCollection: 'GithubRecord',
  priority: 10,
  eventName: 'CodeArenaUpdated',
};

export default config;
