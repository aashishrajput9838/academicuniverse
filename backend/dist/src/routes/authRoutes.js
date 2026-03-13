"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * Public routes (no authentication required)
 */
// POST /api/auth/login
// Body: { email, password }
router.post('/login', authController_1.loginController);
// POST /api/auth/firebase-login
// Body: { firebaseUid }
router.post('/firebase-login', authController_1.firebaseLoginController);
// POST /api/auth/register
// Body: { name, email, password, organizationId, roleId }
router.post('/register', authController_1.registerController);
/**
 * Protected routes (authentication required)
 */
// GET /api/auth/me
// Returns: Current user information from JWT
router.get('/me', (req, res, next) => (0, auth_1.authenticateUser)(req, res, next), authController_1.getMeController);
exports.default = router;
