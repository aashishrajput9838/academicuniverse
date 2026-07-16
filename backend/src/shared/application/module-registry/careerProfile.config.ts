import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'career_profile',
  moduleName: 'Career Profile',
  description: 'Tracks student skills, experience, projects, and education for placement.',
  acceptedDocumentCategories: ['RESUME', 'CERTIFICATE', 'INTERNSHIP', 'OFFER_LETTER', 'MARKSHEET', 'TRANSCRIPT'],
  requiredEntities: ['skills', 'experience', 'projects', 'education'],
  requiredCandidateFields: ['skills', 'experience', 'projects', 'education'],
  canonicalCollection: 'CareerRecord',
  priority: 6,
  eventName: 'CareerUpdated',
};

export default config;
