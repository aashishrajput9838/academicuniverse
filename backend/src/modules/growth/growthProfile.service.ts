import { Person } from '../../models/Person';
import { AcademicRecord } from '../../models/AcademicRecord';
import { CertificateRecord } from '../../models/CertificateRecord';
import { ExperienceRecord } from '../../models/ExperienceRecord';
import { GrowthProfileDTO, AcademicRecordDTO, PersonDTO, CertificateDTO, ExperienceDTO } from './growthProfile.types';
import { GrowthProjectionService } from './growthProjection.service';
import { toObjectId } from '../../utils/mongooseHelpers';

const toIso = (value: Date | string | undefined | null): string => {
  if (!value) return new Date(0).toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
};

export class GrowthProfileService {
  private projectionService = new GrowthProjectionService();

  async getProfile(organizationId: string, authUserId: string): Promise<GrowthProfileDTO> {
    const projection = await this.projectionService.buildProjection(authUserId, organizationId);
    const projectionMetadata = {
      projectionVersion: projection.projectionVersion,
      generatedAt: projection.generatedAt,
      stale: projection.stale,
      sourceVersions: projection.sourceVersions,
    };

    // Resolve the canonical Person linked to the auth user. Reads must not create placeholder people.
    const person = await Person.findOne({
      organizationId: toObjectId(organizationId),
      userIds: toObjectId(authUserId),
    }).lean();

    if (!person) {
      return {
        person: null,
        academicRecords: [],
        certificates: [],
        experiences: [],
        projection: projectionMetadata,
      };
    }

    // Map person to DTO
    const personDto: PersonDTO = {
      id: person._id.toString(),
      primaryName: person.primaryName,
      primaryEmail: person.primaryEmail,
      createdAt: toIso(person.createdAt),
      updatedAt: toIso(person.updatedAt),
    };

    // Load academic records for this person
    const records = await AcademicRecord.find({ organizationId: toObjectId(organizationId), personId: person._id }).lean();
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
      createdAt: toIso(rec.createdAt),
      updatedAt: toIso(rec.updatedAt),
    }));

    // Load certificates
    const certRecs = await CertificateRecord.find({ organizationId: toObjectId(organizationId), personId: person._id }).lean();
    const certificates: CertificateDTO[] = certRecs.map((c) => ({
      id: c._id.toString(),
      sourceDocumentId: c.sourceDocumentId.toString(),
      rawConfidence: c.rawConfidence,
      title: c.title,
      issuer: c.issuer,
      issuedDate: toIso(c.issuedDate),
      createdAt: toIso(c.createdAt),
      updatedAt: toIso(c.updatedAt),
    }));

    // Load experiences
    const expRecs = await ExperienceRecord.find({ organizationId: toObjectId(organizationId), personId: person._id }).lean();
    const experiences: ExperienceDTO[] = expRecs.map((e) => ({
      id: e._id.toString(),
      sourceDocumentId: e.sourceDocumentId.toString(),
      rawConfidence: e.rawConfidence,
      title: e.title,
      company: e.company,
      startDate: toIso(e.startDate),
      endDate: e.endDate ? toIso(e.endDate) : undefined,
      createdAt: toIso(e.createdAt),
      updatedAt: toIso(e.updatedAt),
    }));

    return {
      person: personDto,
      academicRecords,
      certificates,
      experiences,
      projection: projectionMetadata,
    };
  }

}
