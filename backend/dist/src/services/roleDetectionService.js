"use strict";
/**
 * Role Detection Service
 *
 * Automatically detects user roles based on institutional email domains.
 * This is the core security mechanism that prevents unauthorized access.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ORGANIZATION_ID = exports.VALID_DOMAIN = void 0;
exports.detectRoleFromEmail = detectRoleFromEmail;
exports.isAuthorizedEmail = isAuthorizedEmail;
exports.getRoleForEmail = getRoleForEmail;
exports.getPermissionsForEmail = getPermissionsForEmail;
// Define the valid institutional domain
const VALID_DOMAIN = 'sharda.ac.in';
exports.VALID_DOMAIN = VALID_DOMAIN;
const DEFAULT_ORGANIZATION_ID = 'sharda_main';
exports.DEFAULT_ORGANIZATION_ID = DEFAULT_ORGANIZATION_ID;
/**
 * Detects user role based on email domain
 * @param {string} email - User's institutional email
 * @returns {RoleDetectionResult} Object containing role, permissions, and organization info
 * @throws {Error} If email is invalid or domain is not authorized
 */
function detectRoleFromEmail(email) {
    // Validate email format
    if (!email || typeof email !== 'string') {
        throw new Error('Invalid email format');
    }
    // Convert to lowercase for consistent comparison
    const normalizedEmail = email.toLowerCase().trim();
    // Validate email structure
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
        throw new Error('Invalid email format');
    }
    // Check if email belongs to Sharda University domain
    if (!normalizedEmail.endsWith(VALID_DOMAIN)) {
        throw new Error(`Unauthorized institutional email. Only ${VALID_DOMAIN} emails are allowed`);
    }
    // Extract domain prefix to determine role
    // For example: ug.sharda.ac.in -> 'ug', fa.sharda.ac.in -> 'fa'
    const domainParts = normalizedEmail.split('@')[1].split('.');
    const domainPrefix = domainParts[0]; // Gets 'ug' or 'fa' from ug.sharda.ac.in or fa.sharda.ac.in
    // Role detection logic
    let role, permissions;
    switch (domainPrefix) {
        case 'ug':
            // Undergraduate student
            role = 'STUDENT';
            permissions = ['VIEW_DASHBOARD', 'VIEW_OWN_MARKS'];
            break;
        case 'fa':
            // Faculty member
            role = 'FACULTY';
            permissions = ['VIEW_DASHBOARD', 'ADD_MARKS', 'VIEW_ALL_MARKS', 'EDIT_MARKS'];
            break;
        case 'pg':
            // Postgraduate student
            role = 'STUDENT';
            permissions = ['VIEW_DASHBOARD', 'VIEW_OWN_MARKS'];
            break;
        default:
            throw new Error(`Unauthorized email domain: ${domainPrefix}. Only ug.sharda.ac.in, pg.sharda.ac.in, and fa.sharda.ac.in are allowed`);
    }
    return {
        role,
        permissions,
        organizationId: DEFAULT_ORGANIZATION_ID,
        email: normalizedEmail
    };
}
/**
 * Validates if an email belongs to the authorized institution
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is from authorized institution
 */
function isAuthorizedEmail(email) {
    try {
        detectRoleFromEmail(email);
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Gets the expected role for a given email without throwing errors
 * @param {string} email - Email to check
 * @returns {string|null} Role if authorized, null if not
 */
function getRoleForEmail(email) {
    try {
        const { role } = detectRoleFromEmail(email);
        return role;
    }
    catch (error) {
        return null;
    }
}
/**
 * Gets the permissions for a given email
 * @param {string} email - Email to check
 * @returns {string[] | null} Permissions if authorized, null if not
 */
function getPermissionsForEmail(email) {
    try {
        const { permissions } = detectRoleFromEmail(email);
        return permissions;
    }
    catch (error) {
        return null;
    }
}
