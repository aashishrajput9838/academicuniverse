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
