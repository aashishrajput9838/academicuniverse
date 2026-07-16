import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'resume_builder',
  moduleName: 'Resume Builder',
  description: 'Builds student resumes using skills, experience, and projects.',
  acceptedDocumentCategories: ['RESUME', 'CERTIFICATE', 'INTERNSHIP', 'OFFER_LETTER'],
  requiredEntities: ['skills', 'experience', 'projects'],
  requiredCandidateFields: ['skills', 'experience', 'projects'],
  canonicalCollection: 'StudentResume',
  priority: 3,
  eventName: 'ResumeUpdated',
};

export default config;
