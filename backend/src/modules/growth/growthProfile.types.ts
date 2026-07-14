export interface AcademicRecordDTO {
  id: string;
  sourceDocumentId: string;
  rawConfidence: number;
  subjectCode: string;
  subjectName: string;
  semester: string;
  year: number;
  grade: string;
  credits: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonDTO {
  id: string;
  primaryName: string;
  primaryEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateDTO {
  id: string;
  sourceDocumentId: string;
  rawConfidence: number;
  title: string;
  issuer: string;
  issuedDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceDTO {
  id: string;
  sourceDocumentId: string;
  rawConfidence: number;
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthProfileDTO {
  person: PersonDTO;
  academicRecords: AcademicRecordDTO[];
  certificates: CertificateDTO[];
  experiences: ExperienceDTO[];
}
