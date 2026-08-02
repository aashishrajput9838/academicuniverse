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

      // Find candidate users in the tenant (active only, excluding self)
      const tenantUsers = await User.find({
        organizationId,
        isActive: { $ne: false },
        _id: { $ne: currentUser._id }
      })
      .select('_id name email systemId department')
      .lean()
      .exec();

      // Find matching EzoneAcademicProfiles for this tenant
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

      // Combine & prioritize search results
      const resultsMap = new Map<string, StudentSearchResult>();

      // 1. Process profiles first
      for (const p of profiles) {
        if (p.userId && p.userId.toString() === currentUser._id.toString()) {
          continue; // Exclude self
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

        resultsMap.set(p.systemId || p.userId.toString(), {
          id: p._id.toString(),
          userId: p.userId ? p.userId.toString() : '',
          studentName: p.studentName || 'Student',
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

      // 2. Process tenant users not yet synced
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

      // Priority sort: 1. Exact System ID -> 2. Prefix Name -> 3. Partial Name -> 4. Synced first
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

      return allResults.slice(0, 20); // Limit to top 20 matches
    } catch (error) {
      logger.error('Error in searchStudents:', error);
      throw error;
    }
  }

  /**
   * N-Way Scalable Overlap Engine.
   * Calculates common free slots for current user + selected studentIds.
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

      // 1. Fetch current student's synced profile
      const currentProfile = await EzoneAcademicProfile.findOne({
        organizationId,
        userId: currentUser._id
      }).exec();

      if (!currentProfile || !currentProfile.timetable || currentProfile.timetable.length === 0) {
        throw new ValidationError('Your schedule is not synced. Please sync your schedule via College Profile Sync first.');
      }

      // 2. Fetch selected target students' profiles
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
      const participantNames = allProfiles.map(p => p.studentName || 'Student');

      // 3. Convert each student's timetable into weekly free slot indices
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const participantFreeSlots: Record<string, number[]>[] = allProfiles.map(profile => {
        return this.computeWeeklyFreeSlotsFromEzoneTimetable(profile.timetable);
      });

      // 4. Compute N-way intersection of free slots for each day
      const commonFreeSlotsPerDay: Record<string, number[]> = {};

      for (const day of days) {
        const participantSlotsForDay = participantFreeSlots.map(pMap => pMap[day] || []);
        const intersection = this.intersectSlotArrays(participantSlotsForDay);
        if (intersection.length > 0) {
          commonFreeSlotsPerDay[day] = intersection.sort((a, b) => a - b);
        }
      }

      // 5. Build continuous recommendation slots with AI Smart Ranking Score (0 - 100)
      const recommendations: RecommendationSlot[] = [];

      for (const day of days) {
        const slotIndices = commonFreeSlotsPerDay[day];
        if (!slotIndices || slotIndices.length === 0) continue;

        // Group consecutive indices into continuous time blocks
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

      // Sort by Meeting Score descending
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
   */
  private computeWeeklyFreeSlotsFromEzoneTimetable(timetable: any[]): Record<string, number[]> {
    const weeklyFreeSlots: Record<string, number[]> = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const day of days) {
      // Find classes on this day
      const dayClasses = (timetable || []).filter(item => {
        const itemDay = item.day || '';
        return itemDay.toLowerCase() === day.toLowerCase();
      });

      const freeIndices: number[] = [];

      STANDARD_TIME_SLOTS.forEach(stdSlot => {
        const isBusy = dayClasses.some(cls => {
          const timeStr = cls.time || '';
          // Match standard slot start (e.g. 09:00, 09:50, 10:40)
          return timeStr.includes(stdSlot.start);
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

    // 1. Duration Bonus
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

    // 2. Lunch Break Alignment (Slots 4 or 5: 12:25 - 14:05)
    const hasLunch = block.some(idx => idx === 4 || idx === 5);
    if (hasLunch) {
      score += 8;
      reasons.push('Optimal lunch break sync');
    }

    // 3. Afternoon Preference (Slots 5, 6, 7: 13:15 - 15:50)
    const isAfternoon = block.some(idx => idx >= 5 && idx <= 7);
    if (isAfternoon) {
      score += 5;
      reasons.push('Afternoon energy window');
    }

    // 4. Mid-week Preference (Tuesday, Wednesday, Thursday)
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