import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'events',
  moduleName: 'Events',
  description: 'Tracks academic and extracurricular events extracted from emails and calendars.',
  acceptedDocumentCategories: ['OTHER'],
  requiredEntities: ['events', 'dates', 'locations'],
  requiredCandidateFields: ['events', 'dates', 'locations'],
  canonicalCollection: 'KnowledgeRecord',
  priority: 13,
  eventName: 'EventsUpdated',
};

export default config;
