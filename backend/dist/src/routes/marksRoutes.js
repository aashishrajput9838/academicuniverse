"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controllers_1 = require("../controllers");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * All marks routes require authentication and organization isolation
 */
router.use(auth_1.authenticateUser, auth_1.enforceOrgIsolation);
/**
 * POST /api/marks
 * Add marks for a student
 * Requires: ADD_MARKS permission
 */
router.post('/', (0, auth_1.authorize)('ADD_MARKS'), controllers_1.MarksController.addMarksController);
/**
 * GET /api/marks
 * Get all marks for the organization (admin)
 * Requires: VIEW_ALL_MARKS permission
 */
router.get('/', (0, auth_1.authorize)('VIEW_ALL_MARKS'), controllers_1.MarksController.getAllMarksController);
/**
 * GET /api/marks/:studentId
 * Get marks for a specific student
 * Requires: VIEW_MARKS permission
 */
router.get('/:studentId', (0, auth_1.authorize)('VIEW_MARKS'), controllers_1.MarksController.getStudentMarksController);
/**
 * PUT /api/marks/:markId
 * Update marks
 * Requires: EDIT_MARKS permission
 */
router.put('/:markId', (0, auth_1.authorize)('EDIT_MARKS'), controllers_1.MarksController.updateMarksController);
/**
 * DELETE /api/marks/:markId
 * Delete marks
 * Requires: DELETE_MARKS permission
 */
router.delete('/:markId', (0, auth_1.authorize)('DELETE_MARKS'), controllers_1.MarksController.deleteMarksController);
exports.default = router;
