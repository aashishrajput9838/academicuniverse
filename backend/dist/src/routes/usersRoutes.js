"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../middleware/auth");
const usersController_1 = require("../controllers/usersController");
const usersRouter = (0, express_1.Router)();
// Only admins should see all users in the system list
usersRouter.get('/', auth_1.authenticateFirebaseUser, (0, auth_2.authorize)('MANAGE_USERS'), usersController_1.getAllUsersController);
exports.default = usersRouter;
