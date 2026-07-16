import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'certificates',
  moduleName: 'Certificates',
  description: 'Manages student achievement and participation certificates.',
  acceptedDocumentCategories: ['CERTIFICATE'],
  requiredEntities: ['certificate data'],
  requiredCandidateFields: ['title', 'issuer', 'issueDate'],
  canonicalCollection: 'CertificateRecord',
  priority: 5,
  eventName: 'CertificateUpdated',
};

export default config;
