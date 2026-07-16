import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'faculty_cabin',
  moduleName: 'Faculty Cabin',
  description: 'Manages faculty-student communication, office hours, and mentoring sessions.',
  acceptedDocumentCategories: ['OTHER'],
  requiredEntities: ['faculty', 'mentoring', 'office hours'],
  requiredCandidateFields: ['facultyName', 'mentoringTopics', 'officeHours'],
  canonicalCollection: 'Person',
  priority: 11,
  eventName: 'FacultyCabinUpdated',
};

export default config;
