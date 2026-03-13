"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolePermission = exports.Permission = exports.Role = exports.User = exports.Organization = void 0;
const Organization_1 = __importDefault(require("./Organization"));
exports.Organization = Organization_1.default;
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const Role_1 = __importDefault(require("./Role"));
exports.Role = Role_1.default;
const Permission_1 = __importDefault(require("./Permission"));
exports.Permission = Permission_1.default;
const RolePermission_1 = __importDefault(require("./RolePermission"));
exports.RolePermission = RolePermission_1.default;
