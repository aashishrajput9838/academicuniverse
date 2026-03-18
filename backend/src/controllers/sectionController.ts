import { Request, Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import Section from '../models/Section';

/**
 * Get all sections for the organization
 * GET /api/sections
 */
export const getAllSectionsController = async (req: any, res: Response) => {
    try {
        const sections = await Section.find({ organizationId: req.organizationId })
            .populate('representativeId', 'name email roleId')
            .sort({ name: 1 });

        return sendResponse(res, 200, sections, 'Sections retrieved successfully');
    } catch (error: any) {
        console.error('Get all sections error:', error);
        return sendError(res, 500, 'Failed to fetch sections');
    }
};

/**
 * Assign or update a representative for a section
 * PATCH /api/sections/:sectionId/representative
 */
export const updateRepresentativeController = async (req: any, res: Response) => {
    try {
        const { sectionId } = req.params;
        const { representativeId } = req.body;

        const section = await Section.findOneAndUpdate(
            { _id: sectionId, organizationId: req.organizationId },
            { representativeId: representativeId || null },
            { new: true }
        ).populate('representativeId', 'name email');

        if (!section) {
            return sendError(res, 404, 'Section not found');
        }

        return sendResponse(res, 200, section, 'Representative updated successfully');
    } catch (error: any) {
        console.error('Update representative error:', error);
        return sendError(res, 500, 'Failed to update representative');
    }
};

/**
 * Create a new section
 * POST /api/sections
 */
export const createSectionController = async (req: any, res: Response) => {
    try {
        const { name, courseId } = req.body;
        if (!name || !courseId) {
            return sendError(res, 400, 'Section name and courseId are required');
        }

        // Check if a section with this name already exists in this org
        const existingSection = await Section.findOne({
            name,
            organizationId: req.organizationId
        });

        if (existingSection) {
            return sendError(res, 400, 'A section with this name already exists');
        }

        const section = await Section.create({
            name,
            courseId,
            organizationId: req.organizationId
        });

        return sendResponse(res, 201, section, 'Section created successfully');
    } catch (error: any) {
        console.error('Create section error:', error);
        return sendError(res, 500, 'Failed to create section');
    }
};

/**
 * Update an existing section
 * PUT /api/sections/:sectionId
 */
export const updateSectionController = async (req: any, res: Response) => {
    try {
        const { sectionId } = req.params;
        const { name, courseId } = req.body;

        const section = await Section.findOneAndUpdate(
            { _id: sectionId, organizationId: req.organizationId },
            { name, courseId },
            { new: true }
        );

        if (!section) {
            return sendError(res, 404, 'Section not found');
        }

        return sendResponse(res, 200, section, 'Section updated successfully');
    } catch (error: any) {
        console.error('Update section error:', error);
        return sendError(res, 500, 'Failed to update section');
    }
};

/**
 * Delete a section
 * DELETE /api/sections/:sectionId
 */
export const deleteSectionController = async (req: any, res: Response) => {
    try {
        const { sectionId } = req.params;

        const section = await Section.findOneAndDelete({
            _id: sectionId,
            organizationId: req.organizationId
        });

        if (!section) {
            return sendError(res, 404, 'Section not found');
        }

        return sendResponse(res, 200, null, 'Section deleted successfully');
    } catch (error: any) {
        console.error('Delete section error:', error);
        return sendError(res, 500, 'Failed to delete section');
    }
};
