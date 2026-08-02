
import { Logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';
import { EzoneAcademicProfile } from '../models/EzoneAcademicProfile';
import User from '../models/User';
import mongoose from 'mongoose';

const logger = new Logger('overlapService');

// Global standard institutional time slots (50-min periods)
export const STANDARD_TIME_SLOTS = [
  { index: 0, start: "09:00", end: "09:50", period: 1 },
  { index: 1, start: "09:50", end: "10:40", period: 2 },
  { index: 2, start: "10:40", end: "11:30", period: 3 },
  { index: 3, start: "11:35", end: "12:25", period: 4 },
  { index: 4, start: "12:25", end: "13:15", period: 5, isLunch: true },
  { index: 5, start: "13:15", end: "14:05", period: 6, isLunch: true },
  { index: 6, start: "14:10", end: "15:00", period: 7 },
  { index: 7, start: "15:00", end: "15:50", period: 8 },
  { index: 8, start: "15:50", end: "16:40", period: 9 }
];

/**
 * Helper: Convert "HH:MM" or "HH:MM:SS" string to minutes from midnight
 */

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  const parts = clean.split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Helper: Parse "09:00:00 - 09:50:00" or "09:00 - 09:50" time range into minute intervals
 */
function parseTimeRangeToMinutes(timeRangeStr: string): { start: number; end: number } | null {
  if (!timeRangeStr) return null;
  const parts = timeRangeStr.split('-');
  if (parts.length !== 2) return null;
  const start = parseTimeToMinutes(parts[0]);
  const end = parseTimeToMinutes(parts[1]);
  if (start === null || end === null || start >= end) return null;
  return { start, end };
}

/**
 * Helper: Check if two time intervals [startA, endA] and [startB, endB] overlap
 */
function doIntervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

export interface StudentSearchResult {
  id: string;
  userId: string;
  studentName: string;
  systemId: string;
  department: string;
  semester: string;
  program: string;
  school: string;
  syncStatus: 'SYNCED' | 'NEVER_SYNCED' | 'SYNCING' | 'SYNC_FAILED';
  isSelectable: boolean;
  unselectableReason?: string;
  avatarUrl?: string;
}

export interface RecommendationSlot {
  day: string;
  start: string;
  end: string;
  durationMinutes: number;
  score: number;
  reason: string;
  participantCount: number;
  collaborationTag?: string;
}

export interface StudentOverlapResponse {
  bestRecommendation: RecommendationSlot | null;
  otherRecommendations: RecommendationSlot[];
  totalParticipants: number;
  participantNames: string[];
  message?: string;
}

export class OverlapService {
  /**
   * Secure tenant-isolated student search.
   * Derives organizationId from current authenticated user.
   */
  async searchStudents(query: string, currentFirebaseUid: string): Promise<StudentSearchResult[]> {
    try {
      const currentUser = await User.findOne({ firebaseUid: currentFirebaseUid }).exec();
      if (!currentUser) {
        throw new NotFoundError('Authenticated user record not found');
      }

      const organizationId = currentUser.organizationId;
      const cleanQuery = (query || '').trim();

      const tenantUsers = await User.find({
        organizationId,
        isActive: { $ne: false },
        _id: { $ne: currentUser._id }
      })
        .select('_id name email systemId department')
        .lean()
        .exec();

      let profilesQuery: any = { organizationId };

      if (cleanQuery) {
        const regex = new RegExp(cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        profilesQuery.$or = [
          { systemId: regex },
          { studentName: regex },
          { email: regex }
        ];
      }

      const profiles = await EzoneAcademicProfile.find(profilesQuery)
        .select('userId studentName systemId department semester school program timetable lastSyncedAt status')
        .lean()
        .exec();

      const resultsMap = new Map<string, StudentSearchResult>();

      for (const p of profiles) {
        if (p.userId && p.userId.toString() === currentUser._id.toString()) {
          continue;
        }

        const hasTimetable = Array.isArray(p.timetable) && p.timetable.length > 0;
        let syncStatus: 'SYNCED' | 'NEVER_SYNCED' | 'SYNCING' | 'SYNC_FAILED' = 'NEVER_SYNCED';
        let isSelectable = false;
        let unselectableReason: string | undefined = undefined;

        if (hasTimetable) {
          syncStatus = 'SYNCED';
          isSelectable = true;
        } else if (p.lastSyncedAt) {
          syncStatus = 'SYNC_FAILED';
          unselectableReason = 'Schedule sync failed or contains no classes';
        } else {
          syncStatus = 'NEVER_SYNCED';
          unselectableReason = 'Student has not synchronized schedule via E-Zone Sync';
        }

        const resolvedName = (p.studentName && p.studentName !== 'N/A') ? p.studentName : 'Student';

        resultsMap.set(p.systemId || p.userId.toString(), {
          id: p._id.toString(),
          userId: p.userId ? p.userId.toString() : '',
          studentName: resolvedName,
          systemId: p.systemId || 'N/A',
          department: p.department || 'General',
          semester: p.semester || 'N/A',
          program: p.program || p.school || 'Academic Program',
          school: p.school || 'School of Engineering',
          syncStatus,
          isSelectable,
          unselectableReason,
        });
      }

      for (const u of tenantUsers) {
        const uId = u._id.toString();
        const existing = Array.from(resultsMap.values()).find(r => r.userId === uId);

        if (!existing) {
          const sysId = (u as any).systemId || u.email.split('@')[0];
          if (!cleanQuery || u.name.toLowerCase().includes(cleanQuery.toLowerCase()) || sysId.toLowerCase().includes(cleanQuery.toLowerCase())) {
            resultsMap.set(uId, {
              id: uId,
              userId: uId,
              studentName: u.name,
              systemId: sysId,
              department: (u as any).department || 'General',
              semester: 'N/A',
              program: 'Academic Program',
              school: 'University',
              syncStatus: 'NEVER_SYNCED',
              isSelectable: false,
              unselectableReason: 'Schedule not synced via E-Zone Sync module'
            });
          }
        }
      }

      const allResults = Array.from(resultsMap.values());

      if (cleanQuery) {
        const qLower = cleanQuery.toLowerCase();
        allResults.sort((a, b) => {
          const aExactSys = a.systemId.toLowerCase() === qLower ? 0 : 1;
          const bExactSys = b.systemId.toLowerCase() === qLower ? 0 : 1;
          if (aExactSys !== bExactSys) return aExactSys - bExactSys;

          const aPrefix = a.studentName.toLowerCase().startsWith(qLower) ? 0 : 1;
          const bPrefix = b.studentName.toLowerCase().startsWith(qLower) ? 0 : 1;
          if (aPrefix !== bPrefix) return aPrefix - bPrefix;

          const aSelectable = a.isSelectable ? 0 : 1;
          const bSelectable = b.isSelectable ? 0 : 1;
          return aSelectable - bSelectable;
        });
      }

      return allResults.slice(0, 20);
    } catch (error) {
      logger.error('Error in searchStudents:', error);
      throw error;
    }
  }

  /**
   * N-Way Scalable Overlap Engine.
   * Calculates common free slots for current user + selected studentIds.
   * Strictly enforces mathematical interval overlap matching.
   */
  async calculateStudentOverlap(targetStudentIds: string[], currentFirebaseUid: string): Promise<StudentOverlapResponse> {
    try {
      if (!targetStudentIds || !Array.isArray(targetStudentIds) || targetStudentIds.length === 0) {
        throw new ValidationError('At least one target student must be selected');
      }

      const currentUser = await User.findOne({ firebaseUid: currentFirebaseUid }).exec();
      if (!currentUser) {
        throw new NotFoundError('Authenticated user not found');
      }

      const organizationId = currentUser.organizationId;

      const currentProfile = await EzoneAcademicProfile.findOne({ organizationId, userId: currentUser._id }).exec();

      if (!currentProfile || !Array.isArray(currentProfile.timetable) || currentProfile.timetable.length === 0) {
        throw new ValidationError(`Your schedule is not synced. Please sync your schedule via College Profile Sync first.`);
      }

      const objectIds = targetStudentIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      const targetProfiles = await EzoneAcademicProfile.find({
        organizationId,
        $or: [
          { _id: { $in: objectIds } },
          { userId: { $in: objectIds } }
        ]
      }).exec();

      if (targetProfiles.length === 0) {
        throw new NotFoundError('Selected student profiles were not found in your organization');
      }

      const allProfiles = [currentProfile, ...targetProfiles];

      for (const profile of allProfiles) {
        const pName = (profile.studentName && profile.studentName !== 'N/A') ? profile.studentName : 'Student';
        if (!Array.isArray(profile.timetable) || profile.timetable.length === 0) {
          throw new ValidationError(`Student '${pName}' has not synchronized their timetable via E-Zone Sync. Cannot compute overlap.`);
        }
      }

      const participantNames = allProfiles.map(p => {
        if (p.studentName && p.studentName !== 'N/A') return p.studentName;
        return 'Student';
      });

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const participantFreeSlots: Record<string, number[]>[] = allProfiles.map((profile, idx) => {
        return this.computeWeeklyFreeSlotsFromEzoneTimetable(profile.timetable);
      });

      const commonFreeSlotsPerDay: Record<string, number[]> = {};

      for (const day of days) {
        const participantSlotsForDay = participantFreeSlots.map(pMap => pMap[day] || []);
        const intersection = this.intersectSlotArrays(participantSlotsForDay);
        if (intersection.length > 0) {
          commonFreeSlotsPerDay[day] = intersection.sort((a, b) => a - b);
        }
      }

      const recommendations: RecommendationSlot[] = [];

      for (const day of days) {
        const slotIndices = commonFreeSlotsPerDay[day];
        if (!slotIndices || slotIndices.length === 0) continue;

        const blocks = this.groupConsecutiveSlots(slotIndices);

        for (const block of blocks) {
          const startSlot = STANDARD_TIME_SLOTS[block[0]];
          const endSlot = STANDARD_TIME_SLOTS[block[block.length - 1]];
          const durationMinutes = block.length * 50;

          const { score, reason } = this.calculateSmartMeetingScore(day, block, durationMinutes);

          recommendations.push({
            day,
            start: startSlot.start,
            end: endSlot.end,
            durationMinutes,
            score,
            reason,
            participantCount: allProfiles.length,
            collaborationTag: this.getCollaborationTag(block[0], day)
          });
        }
      }

      recommendations.sort((a, b) => b.score - a.score);

      const bestRecommendation = recommendations.length > 0 ? recommendations[0] : null;
      const otherRecommendations = recommendations.length > 1 ? recommendations.slice(1) : [];

      return {
        bestRecommendation,
        otherRecommendations,
        totalParticipants: allProfiles.length,
        participantNames,
        message: recommendations.length === 0 ? 'No common free slot exists between selected students.' : undefined
      };

    } catch (error) {
      logger.error('Error calculating student overlap:', error);
      throw error;
    }
  }

  /**
   * Helper: Calculates free slot indices for standard periods based on E-Zone timetable
   * Uses mathematical interval overlap checking [startA, endA] vs [startB, endB]
   */
  private computeWeeklyFreeSlotsFromEzoneTimetable(timetable: any[]): Record<string, number[]> {
    const weeklyFreeSlots: Record<string, number[]> = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const day of days) {
      const targetDayLower = day.toLowerCase();
      const dayPrefix = targetDayLower.substring(0, 3); // "mon", "tue", "wed", "thu", "fri", "sat"

      const dayClasses = (timetable || []).filter(item => {
        const itemDay = (item.day || '').trim().toLowerCase();
        return itemDay.startsWith(dayPrefix) || itemDay.includes(targetDayLower);
      });

      const freeIndices: number[] = [];

      STANDARD_TIME_SLOTS.forEach(stdSlot => {
        const slotStartMin = parseTimeToMinutes(stdSlot.start);
        const slotEndMin = parseTimeToMinutes(stdSlot.end);

        if (slotStartMin === null || slotEndMin === null) return;

        const isBusy = dayClasses.some(cls => {
          const classTime = parseTimeRangeToMinutes(cls.time);
          if (!classTime) {
            // Fallback string matching if time cannot be parsed
            return (cls.time || '').includes(stdSlot.start);
          }
          // Mathematical interval intersection check
          return doIntervalsOverlap(slotStartMin, slotEndMin, classTime.start, classTime.end);
        });

        if (!isBusy) {
          freeIndices.push(stdSlot.index);
        }
      });

      if (freeIndices.length > 0) {
        weeklyFreeSlots[day] = freeIndices;
      }
    }

    return weeklyFreeSlots;
  }

  /**
   * Group consecutive slot indices into continuous blocks
   */
  private groupConsecutiveSlots(indices: number[]): number[][] {
    if (indices.length === 0) return [];
    const blocks: number[][] = [];
    let currentBlock: number[] = [indices[0]];

    for (let i = 1; i < indices.length; i++) {
      if (indices[i] === indices[i - 1] + 1) {
        currentBlock.push(indices[i]);
      } else {
        blocks.push(currentBlock);
        currentBlock = [indices[i]];
      }
    }
    blocks.push(currentBlock);
    return blocks;
  }

  /**
   * AI Smart Ranking Model (Score 0 - 100)
   */
  private calculateSmartMeetingScore(day: string, block: number[], durationMinutes: number): { score: number; reason: string } {
    let score = 70; // Base score
    const reasons: string[] = [];

    if (durationMinutes >= 150) {
      score += 15;
      reasons.push('Longest uninterrupted common slot');
    } else if (durationMinutes >= 100) {
      score += 10;
      reasons.push('Uninterrupted 1.5+ hour study window');
    } else if (durationMinutes >= 50) {
      score += 5;
      reasons.push('Standard 50-min meeting slot');
    }

    const hasLunch = block.some(idx => idx === 4 || idx === 5);
    if (hasLunch) {
      score += 8;
      reasons.push('Optimal lunch break sync');
    }

    const isAfternoon = block.some(idx => idx >= 5 && idx <= 7);
    if (isAfternoon) {
      score += 5;
      reasons.push('Afternoon energy window');
    }

    if (['Tuesday', 'Wednesday', 'Thursday'].includes(day)) {
      score += 4;
      reasons.push('Mid-week study preference');
    }

    score = Math.min(99, Math.max(50, score));

    return {
      score,
      reason: reasons.length > 0 ? reasons.join(' • ') : 'Available shared time slot'
    };
  }

  private getCollaborationTag(slotIndex: number, day: string): string {
    const tags = [
      'Ideal for Project Sync',
      'Hackathon Practice',
      'Group Study Session',
      'Club Activity Window',
      'Assignment Discussion'
    ];
    return tags[(slotIndex + day.length) % tags.length];
  }

  private intersectSlotArrays(slotArrays: number[][]): number[] {
    if (slotArrays.length === 0) return [];
    let intersection = new Set(slotArrays[0]);

    for (let i = 1; i < slotArrays.length; i++) {
      const currentSet = new Set(slotArrays[i]);
      intersection = new Set([...intersection].filter(x => currentSet.has(x)));
    }

    return Array.from(intersection);
  }
}

export default new OverlapService();