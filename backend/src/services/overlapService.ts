import { firebaseFirestore } from '../config/firebaseAdmin';
import { Logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

const logger = new Logger('overlapService');

// Global time slot configuration
const TIME_SLOTS = [
  { index: 0, start: "09:00", end: "09:50" },
  { index: 1, start: "09:50", end: "10:40" },
  { index: 2, start: "10:40", end: "11:30" },
  { index: 3, start: "11:35", end: "12:25" },
  { index: 4, start: "12:25", end: "13:15" },
  { index: 5, start: "13:15", end: "14:05" },
  { index: 6, start: "14:10", end: "15:00" },
  { index: 7, start: "15:00", end: "15:50" },
  { index: 8, start: "15:50", end: "16:40" }
];

interface WeeklySlots {
  [day: string]: number[];
}

interface TimeRange {
  start: string;
  end: string;
}

interface OverlapResult {
  [day: string]: TimeRange[];
}

interface SectionData {
  organizationId: string;
  sectionName: string;
  representativeUid: string;
}

interface FreeSlotsData {
  organizationId: string;
  weeklyFreeSlots: WeeklySlots;
}

export class OverlapService {
  /**
   * Find common free time slots across multiple sections using precomputed free slots
   * @param sectionIds - Array of section IDs (max 5)
   * @param organizationId - Organization ID for multi-tenant validation
   * @returns OverlapResult with common free time slots for each day
   */
  async findOverlapSlots(sectionIds: string[], organizationId: string): Promise<OverlapResult> {
    try {
      // Validate input
      this.validateInput(sectionIds, organizationId);

      // Fetch precomputed free slots for all sections
      const freeSlotsData = await this.fetchFreeSlots(sectionIds, organizationId);

      // Perform exact slot intersection
      const overlapResult = this.calculateSlotIntersection(freeSlotsData);

      // Convert slot indices to time ranges
      const resultWithTimeRanges = this.convertSlotsToTimeRanges(overlapResult);

      logger.info(`Successfully calculated overlap for ${sectionIds.length} sections`, {
        sectionIds,
        organizationId,
        result: resultWithTimeRanges
      });

      return resultWithTimeRanges;
    } catch (error) {
      logger.error('Error calculating overlap slots:', error);
      throw error;
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(sectionIds: string[], organizationId: string): void {
    if (!sectionIds || sectionIds.length === 0) {
      throw new ValidationError('Section selection cannot be empty');
    }

    if (sectionIds.length > 5) {
      throw new ValidationError('Maximum 5 sections allowed per request');
    }

    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    // Validate section IDs format
    for (const sectionId of sectionIds) {
      if (!sectionId || typeof sectionId !== 'string') {
        throw new ValidationError(`Invalid section ID: ${sectionId}`);
      }
    }
  }

  /**
   * Fetch precomputed free slots for all sections
   */
  private async fetchFreeSlots(sectionIds: string[], organizationId: string): Promise<FreeSlotsData[]> {
    const freeSlotsData: FreeSlotsData[] = [];

    logger.warn('Timetable parsing to free slots not yet implemented - returning mock free slots');

    for (const sectionId of sectionIds) {
      try {
        // Validate section exists and belongs to organization
        await this.validateSection(sectionId, organizationId);

        // Return mock free slots data for development
        const mockFreeSlots: FreeSlotsData = {
          organizationId: organizationId,
          weeklyFreeSlots: {
            'Monday': [3, 4, 5],      // 11:35-12:25, 12:25-13:15, 13:15-14:05
            'Tuesday': [0, 1, 2],     // 09:00-09:50, 09:50-10:40, 10:40-11:30
            'Wednesday': [6, 7, 8],   // 14:10-15:00, 15:00-15:50, 15:50-16:40
            'Thursday': [2, 3, 4],     // 10:40-11:30, 11:35-12:25, 12:25-13:15
            'Friday': [1, 5, 7]       // 09:50-10:40, 13:15-14:05, 15:00-15:50
          }
        };

        freeSlotsData.push(mockFreeSlots);

        logger.info(`Fetched mock free slots for section ${sectionId}`);
      } catch (error: any) {
        logger.error(`Error fetching free slots for section ${sectionId}:`, error);
        throw error;
      }
    }

    return freeSlotsData;
  }

  /**
   * Validate that section exists and belongs to organization
   */
  private async validateSection(sectionId: string, organizationId: string): Promise<void> {
    const Section = (await import('../models/Section')).default;

    const section = await Section.findById(sectionId);

    if (!section) {
      throw new NotFoundError(`Section not found: ${sectionId}`);
    }

    if (section.organizationId.toString() !== organizationId.toString()) {
      throw new ValidationError(`Section ${sectionId} does not belong to your organization`);
    }
  }

  /**
   * Calculate exact slot intersection across all sections
   */
  private calculateSlotIntersection(freeSlotsData: FreeSlotsData[]): WeeklySlots {
    // Initialize result with first section's free slots
    const result: WeeklySlots = {};

    if (freeSlotsData.length === 0) {
      return result;
    }

    // Get all unique days from all sections
    const allDays: string[] = [];
    freeSlotsData.forEach(data => {
      Object.keys(data.weeklyFreeSlots).forEach(day => {
        if (!allDays.includes(day)) {
          allDays.push(day);
        }
      });
    });

    // For each day, calculate intersection
    for (const day of allDays) {
      const daySlots: number[][] = [];

      // Collect slots for this day from all sections
      freeSlotsData.forEach(data => {
        const slots = data.weeklyFreeSlots[day] || [];
        daySlots.push(slots);
      });

      // Calculate intersection using Set operations
      if (daySlots.length > 0) {
        const intersection = this.intersectSlotArrays(daySlots);
        if (intersection.length > 0) {
          result[day] = intersection;
        }
      }
    }

    return result;
  }

  /**
   * Intersect multiple slot arrays using Set operations
   */
  private intersectSlotArrays(slotArrays: number[][]): number[] {
    if (slotArrays.length === 0) return [];

    // Start with first array
    let intersection = new Set(slotArrays[0]);

    // Intersect with remaining arrays
    for (let i = 1; i < slotArrays.length; i++) {
      const currentSet = new Set(slotArrays[i]);
      const filteredArray: number[] = [];
      intersection.forEach(x => {
        if (currentSet.has(x)) {
          filteredArray.push(x);
        }
      });
      intersection = new Set(filteredArray);
    }

    return Array.from(intersection).sort((a, b) => a - b);
  }

  /**
   * Convert slot indices to time ranges
   */
  private convertSlotsToTimeRanges(weeklySlots: WeeklySlots): OverlapResult {
    const result: OverlapResult = {};

    for (const [day, slots] of Object.entries(weeklySlots)) {
      result[day] = slots.map(slotIndex => {
        const timeSlot = TIME_SLOTS.find(ts => ts.index === slotIndex);
        if (!timeSlot) {
          logger.warn(`Time slot not found for index: ${slotIndex}`);
          return { start: "00:00", end: "00:00" };
        }
        return {
          start: timeSlot.start,
          end: timeSlot.end
        };
      });
    }

    return result;
  }

  /**
   * Get available sections for an organization
   */
  async getAvailableSections(organizationId: string): Promise<SectionData[]> {
    try {
      const Section = (await import('../models/Section')).default;

      const dbSections = await Section.find({ organizationId });

      const sections: SectionData[] = dbSections.map(s => ({
        _id: s._id.toString(),
        sectionName: s.name,
        representativeUid: s.representativeId ? s.representativeId.toString() : '',
        organizationId: s.organizationId.toString()
      } as unknown as SectionData));

      logger.info(`Found ${sections.length} sections for organization ${organizationId} from MongoDB`);
      return sections;
    } catch (error) {
      logger.error('Error fetching available sections:', error);
      throw new Error('Failed to fetch available sections');
    }
  }
}

// Export singleton instance
export default new OverlapService();