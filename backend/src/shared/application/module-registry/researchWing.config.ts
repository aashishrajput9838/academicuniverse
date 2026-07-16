import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'research_wing',
  moduleName: 'Research Wing',
  description: 'Tracks research papers and publications.',
  acceptedDocumentCategories: ['RESEARCH_PAPER'],
  requiredEntities: ['research papers', 'publications'],
  requiredCandidateFields: ['title', 'authors', 'journal', 'abstract'],
  canonicalCollection: 'ResearchPaperRecord',
  priority: 4,
  eventName: 'ResearchUpdated',
};

export default config;
