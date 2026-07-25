import { createResumeLogger, logStageEntry, logStageExit, scrubPII } from '../../utils/structuredLogging';
import { ResumeParseResult } from '../../models/ResumeParseResult';
import { ResumePersonSuggestion } from '../../models/ResumePersonSuggestion';
import { Person } from '../../models/Person';
import { ExperienceRecord } from '../../models/ExperienceRecord';
import { AcademicRecord } from '../../models/AcademicRecord';
import { SkillEvidence } from '../../models/SkillEvidence';
import { CertificateRecord } from '../../models/CertificateRecord';
import { CareerRecord } from '../../models/CareerRecord';
import { UaipEvent, UaipEventPayload } from '../../events/UaipEvents';
import { eventBus } from '../../events/EventBus';
import { Types } from 'mongoose';

const logger = createResumeLogger('CanonicalWriteService');

export interface CanonicalWriteInput {
  processingId: string;
  organizationId: string;
  userId: string;
  rawCandidateFields: Record<string, any>;
  confidenceScore: number;
}

export interface CanonicalWriteOutput {
  success: boolean;
  personId?: string;
  recordsWritten: number;
  recordsSkipped: number;
  strategy: 'new_person' | 'existing_person';
}

function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return (phone || '').replace(/[^\d+]/g, '');
}

function jaroWinkler(s1: string, s2: string): number {
  const s = s1 || '';
  const t = s2 || '';
  if (s === t) return 1.0;
  if (!s.length || !t.length) return 0.0;

  const sLen = s.length;
  const tLen = t.length;
  const matchWindow = Math.floor(Math.max(sLen, tLen) / 2) - 1;
  const sMatches = new Array(sLen).fill(false);
  const tMatches = new Array(tLen).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < sLen; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, tLen);
    for (let j = start; j < end; j++) {
      if (tMatches[j] || s[i] !== t[j]) continue;
      sMatches[i] = true;
      tMatches[j] = true;
      matches++;
      break;
    }
  }

  if (!matches) return 0.0;

  let k = 0;
  for (let i = 0; i < sLen; i++) {
    if (!sMatches[i]) continue;
    while (!tMatches[k]) k++;
    if (s[i] !== t[k]) transpositions++;
    k++;
  }

  const jaro = (matches / sLen + matches / tLen + (matches - transpositions / 2) / matches) / 3;

  const prefix = Math.min(4, Math.min(sLen, tLen));
  let commonPrefix = 0;
  for (let i = 0; i < prefix; i++) {
    if (s[i] === t[i]) commonPrefix++;
    else break;
  }

  return jaro + commonPrefix * 0.1 * (1 - jaro);
}

export class CanonicalWriteService {
   async write(params: CanonicalWriteInput): Promise<CanonicalWriteOutput> {
     const { processingId, organizationId, userId, rawCandidateFields, confidenceScore } = params;
     logStageEntry(logger, 'canonical_write', { processingId, organizationId, userId, stage: 'canonical_write' });

    let personId: Types.ObjectId;
    let strategy: 'new_person' | 'existing_person';
    let recordsWritten = 0;
    let recordsSkipped = 0;

    try {
      const result = await ResumeParseResult.findOne({ processingId }).lean().exec();
      if (!result) {
        throw new Error(`ResumeParseResult not found: ${processingId}`);
      }

       if (result.canonicalWrittenAt) {
         logStageExit(logger, 'canonical_write', { processingId, organizationId, userId, stage: 'canonical_write' });
         return {
           success: true,
           personId: (result as any).personId?.toString(),
           recordsWritten: 0,
           recordsSkipped: 0,
           strategy: 'existing_person',
         };
       }

      const sections = Array.isArray(rawCandidateFields.sections) ? rawCandidateFields.sections : [];
      const personSection = sections.find((s: any) => s.title === 'HEADER');
      const experienceEntries = this.extractEntries(sections, 'EXPERIENCE');
      const educationEntries = this.extractEntries(sections, 'EDUCATION');
      const skillEntries = this.extractEntries(sections, 'SKILLS');
      const certEntries = this.extractEntries(sections, 'CERTIFICATIONS');
      const projectEntries = this.extractEntries(sections, 'PROJECTS');
      const achievementEntries = this.extractEntries(sections, 'ACHIEVEMENTS');

      const existingPersonResult = await this.findExistingPerson(organizationId, personSection, sections);
      const existingPerson = existingPersonResult?.person;
      const matchBasis = existingPersonResult?.matchBasis || [];

      if (existingPerson) {
        personId = existingPerson._id;
        strategy = 'existing_person';

        await ResumePersonSuggestion.create({
          processingId,
          organizationId,
          suggestedPersonId: personId,
          matchConfidence: 1.0,
          matchBasis,
          isNewPerson: false,
          status: 'ACCEPTED',
        });
      } else {
        const newPerson = await Person.create({
          organizationId,
          primaryName: this.extractName(personSection) || 'Unknown',
          primaryEmail: this.extractEmail(personSection) || '',
          admissionYear: undefined,
          userIds: [userId],
        });

        personId = newPerson._id;
        strategy = 'new_person';

        await ResumePersonSuggestion.create({
          processingId,
          organizationId,
          suggestedPersonId: personId,
          matchConfidence: 0,
          matchBasis: [],
          isNewPerson: true,
          status: 'PENDING',
        });
      }

      if (experienceEntries.length > 0) {
        for (const entry of experienceEntries) {
          try {
            await ExperienceRecord.create({
              organizationId,
              personId,
              sourceDocumentId: processingId,
              rawConfidence: confidenceScore,
              title: entry.title || entry.position || 'Unknown',
              company: entry.company || entry.organization || 'Unknown',
              startDate: entry.startDate ? new Date(entry.startDate) : new Date(),
              endDate: entry.endDate ? new Date(entry.endDate) : undefined,
            });
            recordsWritten++;
          } catch (err: any) {
            if (err.code === 11000) {
              recordsSkipped++;
            } else {
              throw err;
            }
          }
        }
      }

      if (educationEntries.length > 0) {
        for (const entry of educationEntries) {
          try {
            await AcademicRecord.create({
              organizationId: organizationId,
              personId,
              sourceDocumentId: processingId,
              rawConfidence: confidenceScore,
              subjectCode: entry.degree || 'N/A',
              subjectName: entry.institution || 'Unknown',
              semester: 'N/A',
              year: entry.endDate ? new Date(entry.endDate).getFullYear() : new Date().getFullYear(),
              term: 'N/A',
              academicYear: entry.endDate ? new Date(entry.endDate).getFullYear() : new Date().getFullYear(),
              grade: entry.gpa || 'N/A',
              gradePoints: 0,
              gradingStatus: 'N/A',
              credits: 0,
              status: 'completed',
            });
            recordsWritten++;
          } catch (err: any) {
            if (err.code === 11000) {
              recordsSkipped++;
            } else {
              throw err;
            }
          }
        }
      }

      if (skillEntries.length > 0) {
        for (const entry of skillEntries) {
          try {
            await SkillEvidence.create({
              organizationId: organizationId,
              personId,
              sourceDocumentId: processingId,
              skillId: entry.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
              skillName: entry.name || 'Unknown',
              aliases: [],
              primarySource: 'resume_parser',
              sourceType: 'resume',
              sourceSubtype: 'parsed',
              payload: entry,
              confidence: confidenceScore,
              extractedBy: 'resume-parser',
              effectiveFrom: new Date(),
              status: 'ACTIVE',
            });
            recordsWritten++;
          } catch (err: any) {
            if (err.code === 11000) {
              recordsSkipped++;
            } else {
              throw err;
            }
          }
        }
      }

      if (certEntries.length > 0) {
        for (const entry of certEntries) {
          try {
            await CertificateRecord.create({
              organizationId: organizationId,
              personId,
              sourceDocumentId: processingId,
              rawConfidence: confidenceScore,
              title: entry.title || 'Unknown',
              issuer: entry.issuer || 'Unknown',
              issuedDate: entry.issueDate ? new Date(entry.issueDate) : new Date(),
            });
            recordsWritten++;
          } catch (err: any) {
            if (err.code === 11000) {
              recordsSkipped++;
            } else {
              throw err;
            }
          }
        }
      }

      if (projectEntries.length > 0 || achievementEntries.length > 0) {
        const projects = projectEntries.map((entry: any) => ({
          name: entry.name || 'Unknown',
          description: entry.description || '',
          techStack: entry.techStack || [],
        }));

        const achievements = achievementEntries.map((entry: any) => ({
          title: entry.title || 'Unknown',
          description: entry.description || '',
          date: entry.date || '',
        }));

        try {
          await CareerRecord.create({
            organizationId: organizationId,
            personId,
            sourceDocumentId: processingId,
            rawConfidence: confidenceScore,
            skills: [],
            experience: {},
            projects,
            education: achievements,
          });
          recordsWritten++;
        } catch (err: any) {
          if (err.code === 11000) {
            recordsSkipped++;
          } else {
            throw err;
          }
        }
      }

      await ResumeParseResult.findOneAndUpdate(
        { processingId },
        {
          $set: {
            canonicalWrittenAt: new Date(),
            personId,
          },
        }
      );

       await eventBus.publish(UaipEvent.ResumeCanonicalWritten, {
         processingId,
         organizationId,
         userId,
         personId: personId.toString(),
         recordsWritten,
         recordsSkipped,
         strategy,
         timestamp: new Date(),
       } as UaipEventPayload);

       logStageExit(logger, 'canonical_write', { processingId, organizationId, userId, stage: 'canonical_write' });

       return {
         success: true,
         personId: personId.toString(),
         recordsWritten,
         recordsSkipped,
         strategy,
       };
     } catch (err: any) {
       logStageExit(logger, 'canonical_write', { processingId, organizationId, userId, stage: 'canonical_write' });
      await eventBus.publish(UaipEvent.ResumeCanonicalWriteFailed, {
        processingId,
        organizationId,
        userId,
        errorMessage: err.message,
        reason: 'unknown',
        timestamp: new Date(),
      } as UaipEventPayload);

      throw err;
    }
  }

  private async findExistingPerson(organizationId: string, personSection: any, sections: any[]): Promise<{ person: any; matchBasis: string[] } | null> {
    if (!personSection) return null;

    const headerEntities = personSection.entities || [];
    const rawEmail = headerEntities.find((e: any) => e.type === 'email')?.data?.value || '';
    const rawPhone = headerEntities.find((e: any) => e.type === 'phone')?.data?.value || '';
    const rawName = this.extractName(personSection) || '';
    const normalizedEmail = normalizeEmail(rawEmail);

    let existingPerson: any = null;
    let matchedByIndex = false;

    if (normalizedEmail) {
      existingPerson = await Person.findOne({ organizationId, primaryEmail: normalizedEmail }).lean().exec();
      if (existingPerson) {
        matchedByIndex = true;
      }
    }

    if (!existingPerson) {
      existingPerson = await Person.findOne({ organizationId }).lean().exec();
    }
    if (!existingPerson) return null;

    const emailMatch = normalizeEmail(rawEmail) === normalizeEmail(existingPerson.primaryEmail);
    const phoneMatch = normalizePhone(rawPhone) === normalizePhone('');
    const nameScore = jaroWinkler(rawName, existingPerson.primaryName);

    let institutionScore = 0;
    if (!matchedByIndex) {
      const institutionRaw = this.extractInstitutionFromSections(sections);
      if (institutionRaw) {
        const academicRecords = await AcademicRecord.find({ organizationId }).lean().exec();
        for (const record of academicRecords) {
          const score = jaroWinkler(institutionRaw, (record as any).subjectName || '');
          institutionScore = Math.max(institutionScore, score);
        }
      }
    }

    const isDuplicate =
      emailMatch ||
      phoneMatch ||
      (nameScore >= 0.92 && (emailMatch || phoneMatch || institutionScore >= 0.85));

    if (isDuplicate) {
      const matchBasis: string[] = [];
      if (emailMatch) matchBasis.push('email');
      if (phoneMatch) matchBasis.push('phone');
      if (nameScore >= 0.92) matchBasis.push('name+jaro');
      if (institutionScore >= 0.85) matchBasis.push('institution');

      return {
        person: await Person.findById(existingPerson._id).lean().exec(),
        matchBasis,
      };
    }

    return null;
  }

  private extractName(personSection: any): string | null {
    if (!personSection) return null;
    const nameEntity = personSection.entities?.find((e: any) => e.type === 'name');
    return nameEntity?.data?.value || personSection.rawText?.split('\n')?.[0] || null;
  }

  private extractEmail(personSection: any): string | null {
    if (!personSection) return null;
    const emailEntity = personSection.entities?.find((e: any) => e.type === 'email');
    return emailEntity?.data?.value || null;
  }

  private extractInstitutionFromSections(sections: any[]): string | null {
    const educationSection = sections.find((s: any) => s.title === 'EDUCATION');
    if (!educationSection) return null;
    const entries = educationSection.entries || [];
    if (entries.length > 0 && entries[0].institution) {
      return entries[0].institution;
    }
    return null;
  }

  private extractEntries(sections: any[], title: string): any[] {
    const section = sections.find((s: any) => s.title === title);
    if (!section) return [];
    return section.entries || [];
  }
}

export const canonicalWriteService = new CanonicalWriteService();
