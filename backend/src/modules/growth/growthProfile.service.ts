import { Person } from '../../models/Person';
import { AcademicRecord } from '../../models/AcademicRecord';
import { CertificateRecord } from '../../models/CertificateRecord';
import { ExperienceRecord } from '../../models/ExperienceRecord';
import { GrowthProfileDTO, AcademicRecordDTO, PersonDTO, CertificateDTO, ExperienceDTO } from './growthProfile.types';



export class GrowthProfileService {
  async getProfile(organizationId: string, authUserId: string): Promise<GrowthProfileDTO> {
    // Resolve the canonical Person linked to the auth user
    const person = await Person.findOne({ organizationId, userIds: authUserId }).lean();
    if (!person) {
      throw new Error('Person not found');
    }

    // Map person to DTO
    const personDto: PersonDTO = {
      id: person._id.toString(),
      primaryName: person.primaryName,
      primaryEmail: person.primaryEmail,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
    };

    // Load academic records for this person
    const records = await AcademicRecord.find({ organizationId, personId: person._id }).lean();
    const academicRecords: AcademicRecordDTO[] = records.map((rec) => ({
      id: rec._id.toString(),
      sourceDocumentId: rec.sourceDocumentId.toString(),
      rawConfidence: rec.rawConfidence,
      subjectCode: rec.subjectCode,
      subjectName: rec.subjectName,
      semester: rec.semester,
      year: rec.year,
      grade: rec.grade,
      credits: rec.credits,
      status: rec.status,
      createdAt: rec.createdAt.toISOString(),
      updatedAt: rec.updatedAt.toISOString(),
    }));

    // Load certificates
    const certRecs = await CertificateRecord.find({ organizationId, personId: person._id }).lean();
    const certificates: CertificateDTO[] = certRecs.map((c) => ({
      id: c._id.toString(),
      sourceDocumentId: c.sourceDocumentId.toString(),
      rawConfidence: c.rawConfidence,
      title: c.title,
      issuer: c.issuer,
      issuedDate: c.issuedDate.toISOString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    // Load experiences
    const expRecs = await ExperienceRecord.find({ organizationId, personId: person._id }).lean();
    const experiences: ExperienceDTO[] = expRecs.map((e) => ({
      id: e._id.toString(),
      sourceDocumentId: e.sourceDocumentId.toString(),
      rawConfidence: e.rawConfidence,
      title: e.title,
      company: e.company,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate ? e.endDate.toISOString() : undefined,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    return {
      person: personDto,
      academicRecords,
      certificates,
      experiences,
    };
  }

}
