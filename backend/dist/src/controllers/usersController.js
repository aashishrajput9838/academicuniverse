"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsersController = void 0;
const response_1 = require("../utils/response");
const User_1 = __importDefault(require("../models/User"));
/**
 * Get all users for the current organization
 * GET /api/users
 */
const getAllUsersController = async (req, res) => {
    try {
        const users = await User_1.default.find({ organizationId: req.organizationId })
            .populate('roleId', 'name')
            .select('name email roleId isActive firebaseUid')
            .sort({ name: 1 });
        return (0, response_1.sendResponse)(res, 200, users, 'Users retrieved successfully');
    }
    catch (error) {
        console.error('Get all users error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to fetch users');
    }
};
exports.getAllUsersController = getAllUsersController;
