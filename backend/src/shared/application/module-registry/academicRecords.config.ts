import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'academic_records',
  moduleName: 'Academic Records',
  description: 'Manages academic marks, marksheets, and transcripts.',
  acceptedDocumentCategories: ['MARKSHEET', 'TRANSCRIPT'],
  requiredEntities: ['subjects', 'gpa'],
  requiredCandidateFields: ['subjects', 'gpa'],
  canonicalCollection: 'AcademicRecord',
  priority: 8,
  eventName: 'AcademicRecordUpdated',
};

export default config;
