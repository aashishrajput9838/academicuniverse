"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRepresentativeController = exports.getAllSectionsController = void 0;
const response_1 = require("../utils/response");
const Section_1 = __importDefault(require("../models/Section"));
/**
 * Get all sections for the organization
 * GET /api/sections
 */
const getAllSectionsController = async (req, res) => {
    try {
        const sections = await Section_1.default.find({ organizationId: req.organizationId })
            .populate('representativeId', 'name email roleId')
            .sort({ name: 1 });
        return (0, response_1.sendResponse)(res, 200, sections, 'Sections retrieved successfully');
    }
    catch (error) {
        console.error('Get all sections error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to fetch sections');
    }
};
exports.getAllSectionsController = getAllSectionsController;
/**
 * Assign or update a representative for a section
 * PATCH /api/sections/:sectionId/representative
 */
const updateRepresentativeController = async (req, res) => {
    try {
        const { sectionId } = req.params;
        const { representativeId } = req.body;
        const section = await Section_1.default.findOneAndUpdate({ _id: sectionId, organizationId: req.organizationId }, { representativeId: representativeId || null }, { new: true }).populate('representativeId', 'name email');
        if (!section) {
            return (0, response_1.sendError)(res, 404, 'Section not found');
        }
        return (0, response_1.sendResponse)(res, 200, section, 'Representative updated successfully');
    }
    catch (error) {
        console.error('Update representative error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to update representative');
    }
};
exports.updateRepresentativeController = updateRepresentativeController;
