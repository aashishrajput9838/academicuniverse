"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverlapService = void 0;
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const logger = new logger_1.Logger('overlapService');
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
class OverlapService {
    /**
     * Find common free time slots across multiple sections using precomputed free slots
     * @param sectionIds - Array of section IDs (max 5)
     * @param organizationId - Organization ID for multi-tenant validation
     * @returns OverlapResult with common free time slots for each day
     */
    async findOverlapSlots(sectionIds, organizationId) {
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
        }
        catch (error) {
            logger.error('Error calculating overlap slots:', error);
            throw error;
        }
    }
    /**
     * Validate input parameters
     */
    validateInput(sectionIds, organizationId) {
        if (!sectionIds || sectionIds.length === 0) {
            throw new errors_1.ValidationError('Section selection cannot be empty');
        }
        if (sectionIds.length > 5) {
            throw new errors_1.ValidationError('Maximum 5 sections allowed per request');
        }
        if (!organizationId) {
            throw new errors_1.ValidationError('Organization ID is required');
        }
        // Validate section IDs format
        for (const sectionId of sectionIds) {
            if (!sectionId || typeof sectionId !== 'string') {
                throw new errors_1.ValidationError(`Invalid section ID: ${sectionId}`);
            }
        }
    }
    /**
     * Fetch precomputed free slots for all sections
     */
    async fetchFreeSlots(sectionIds, organizationId) {
        const freeSlotsData = [];
        // Check if we're in development mode by checking Firestore credentials
        try {
            if (firebaseAdmin_1.firebaseFirestore.collection) {
                await firebaseAdmin_1.firebaseFirestore.collection('test').limit(1).get();
            }
        }
        catch (firestoreError) {
            if (firestoreError.message && firestoreError.message.includes('credentials')) {
                logger.warn('Using mock Firestore - returning sample free slots for development');
                // Return mock free slots data for development
                sectionIds.forEach(sectionId => {
                    const mockFreeSlots = {
                        organizationId: organizationId,
                        weeklyFreeSlots: {
                            'Monday': [3, 4, 5], // 11:35-12:25, 12:25-13:15, 13:15-14:05
                            'Tuesday': [0, 1, 2], // 09:00-09:50, 09:50-10:40, 10:40-11:30
                            'Wednesday': [6, 7, 8], // 14:10-15:00, 15:00-15:50, 15:50-16:40
                            'Thursday': [2, 3, 4], // 10:40-11:30, 11:35-12:25, 12:25-13:15
                            'Friday': [1, 5, 7] // 09:50-10:40, 13:15-14:05, 15:00-15:50
                        }
                    };
                    freeSlotsData.push(mockFreeSlots);
                });
                logger.info(`Returning mock free slots for ${sectionIds.length} sections`);
                return freeSlotsData;
            }
            throw firestoreError;
        }
        for (const sectionId of sectionIds) {
            try {
                // Validate section exists and belongs to organization
                await this.validateSection(sectionId, organizationId);
                // Fetch precomputed free slots
                const freeSlotsDoc = await firebaseAdmin_1.firebaseFirestore
                    .collection('freeSlots')
                    .doc(sectionId)
                    .get();
                if (!freeSlotsDoc.exists) {
                    throw new errors_1.NotFoundError(`Free slots data not found for section: ${sectionId}`);
                }
                const freeSlots = freeSlotsDoc.data();
                // Validate organization ownership
                if (freeSlots.organizationId !== organizationId) {
                    throw new errors_1.ValidationError(`Section ${sectionId} does not belong to your organization`);
                }
                freeSlotsData.push({
                    organizationId: freeSlots.organizationId,
                    weeklyFreeSlots: freeSlots.weeklyFreeSlots || {}
                });
                logger.info(`Fetched free slots for section ${sectionId}`, {
                    organizationId,
                    days: Object.keys(freeSlots.weeklyFreeSlots || {}).length
                });
            }
            catch (error) {
                logger.error(`Error fetching free slots for section ${sectionId}:`, error);
                if (error instanceof errors_1.NotFoundError || error instanceof errors_1.ValidationError) {
                    throw error;
                }
                throw new Error(`Failed to fetch data for section ${sectionId}: ${error.message || error}`);
            }
        }
        return freeSlotsData;
    }
    /**
     * Validate that section exists and belongs to organization
     */
    async validateSection(sectionId, organizationId) {
        // Check if we're in development mode by checking Firestore credentials
        try {
            if (firebaseAdmin_1.firebaseFirestore.collection) {
                await firebaseAdmin_1.firebaseFirestore.collection('test').limit(1).get();
            }
        }
        catch (firestoreError) {
            if (firestoreError.message && firestoreError.message.includes('credentials')) {
                logger.warn(`Using mock Firestore - skipping section validation for ${sectionId}`);
                return; // Skip validation in development mode
            }
            throw firestoreError;
        }
        const sectionDoc = await firebaseAdmin_1.firebaseFirestore
            .collection('sections')
            .doc(sectionId)
            .get();
        if (!sectionDoc.exists) {
            throw new errors_1.NotFoundError(`Section not found: ${sectionId}`);
        }
        const sectionData = sectionDoc.data();
        if (sectionData.organizationId !== organizationId) {
            throw new errors_1.ValidationError(`Section ${sectionId} does not belong to your organization`);
        }
    }
    /**
     * Calculate exact slot intersection across all sections
     */
    calculateSlotIntersection(freeSlotsData) {
        // Initialize result with first section's free slots
        const result = {};
        if (freeSlotsData.length === 0) {
            return result;
        }
        // Get all unique days from all sections
        const allDays = [];
        freeSlotsData.forEach(data => {
            Object.keys(data.weeklyFreeSlots).forEach(day => {
                if (!allDays.includes(day)) {
                    allDays.push(day);
                }
            });
        });
        // For each day, calculate intersection
        for (const day of allDays) {
            const daySlots = [];
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
    intersectSlotArrays(slotArrays) {
        if (slotArrays.length === 0)
            return [];
        // Start with first array
        let intersection = new Set(slotArrays[0]);
        // Intersect with remaining arrays
        for (let i = 1; i < slotArrays.length; i++) {
            const currentSet = new Set(slotArrays[i]);
            const filteredArray = [];
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
    convertSlotsToTimeRanges(weeklySlots) {
        const result = {};
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
    async getAvailableSections(organizationId) {
        try {
            // Check if we're in development mode by checking if we can access Firestore properly
            try {
                // Try a simple Firestore operation to test if credentials are available
                if (firebaseAdmin_1.firebaseFirestore.collection) {
                    // Test if we have real Firestore by attempting to access it
                    const testCollection = firebaseAdmin_1.firebaseFirestore.collection('test');
                    if (typeof testCollection.limit === 'function') {
                        // We have real Firestore, proceed with the query
                        const sectionsSnapshot = await firebaseAdmin_1.firebaseFirestore
                            .collection('sections')
                            .where('organizationId', '==', organizationId)
                            .get();
                        const sections = [];
                        sectionsSnapshot.forEach((doc) => {
                            const data = doc.data();
                            sections.push({
                                ...data,
                                _id: doc.id
                            });
                        });
                        logger.info(`Found ${sections.length} sections for organization ${organizationId}`);
                        return sections;
                    }
                }
            }
            catch (firestoreError) {
                // If we get a credentials error, use mock data
                if (firestoreError.message && firestoreError.message.includes('credentials')) {
                    logger.warn('Firestore credentials not available - using mock data for development');
                    // Return mock data for development
                    const mockSections = [
                        {
                            _id: 'section_I',
                            sectionName: 'Section I',
                            representativeUid: 'mock-user-1',
                            organizationId: organizationId
                        },
                        {
                            _id: 'section_C',
                            sectionName: 'Section C',
                            representativeUid: 'mock-user-2',
                            organizationId: organizationId
                        },
                        {
                            _id: 'section_E',
                            sectionName: 'Section E',
                            representativeUid: 'mock-user-3',
                            organizationId: organizationId
                        }
                    ];
                    logger.info(`Returning ${mockSections.length} mock sections for organization ${organizationId}`);
                    return mockSections;
                }
                // If it's a different error, re-throw it
                throw firestoreError;
            }
            // If we reach here, we're using mock Firestore
            logger.warn('Using mock Firestore - returning sample sections for development');
            // Return mock data for development
            const mockSections = [
                {
                    _id: 'section_I',
                    sectionName: 'Section I',
                    representativeUid: 'mock-user-1',
                    organizationId: organizationId
                },
                {
                    _id: 'section_C',
                    sectionName: 'Section C',
                    representativeUid: 'mock-user-2',
                    organizationId: organizationId
                },
                {
                    _id: 'section_E',
                    sectionName: 'Section E',
                    representativeUid: 'mock-user-3',
                    organizationId: organizationId
                }
            ];
            logger.info(`Returning ${mockSections.length} mock sections for organization ${organizationId}`);
            return mockSections;
        }
        catch (error) {
            logger.error('Error fetching available sections:', error);
            throw new Error('Failed to fetch available sections');
        }
    }
}
exports.OverlapService = OverlapService;
// Export singleton instance
exports.default = new OverlapService();
