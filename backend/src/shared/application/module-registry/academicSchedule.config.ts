import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'academic_schedule',
  moduleName: 'Academic Schedule',
  description: 'Manages student timetables and schedules.',
  acceptedDocumentCategories: ['ACADEMIC_TIMETABLE'],
  requiredEntities: ['schedule', 'course', 'room', 'time'],
  requiredCandidateFields: ['schedule'],
  canonicalCollection: 'AcademicSchedule',
  priority: 2,
  eventName: 'AcademicScheduleUpdated',
};

export default config;
