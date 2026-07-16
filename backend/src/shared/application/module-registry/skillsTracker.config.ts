import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'skills_tracker',
  moduleName: 'Skills Tracker',
  description: 'Tracks student skills, competencies, and skill development over time.',
  acceptedDocumentCategories: ['RESUME', 'CERTIFICATE', 'TRANSCRIPT', 'MARKSHEET'],
  requiredEntities: ['skills', 'competencies'],
  requiredCandidateFields: ['skills', 'competencies'],
  canonicalCollection: 'CareerRecord',
  priority: 9,
  eventName: 'SkillsUpdated',
};

export default config;
