import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'growth_hub',
  moduleName: 'Growth Hub',
  description: 'Tracks holistic student growth based on academic marks, attendance, scheduling, certificates, and experience.',
  acceptedDocumentCategories: ['MARKSHEET', 'TRANSCRIPT', 'ACADEMIC_TIMETABLE', 'CERTIFICATE', 'RESUME', 'INTERNSHIP', 'OFFER_LETTER'],
  requiredEntities: ['marks', 'attendance', 'schedule', 'certificates', 'experience'],
  requiredCandidateFields: ['subjects', 'gpa', 'schedule', 'title', 'issuer', 'experience', 'company'],
  canonicalCollection: 'GrowthHubRecord',
  priority: 1,
  eventName: 'GrowthHubUpdated',
};

export default config;
