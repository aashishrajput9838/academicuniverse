import { Request, Response } from 'express';
import { User } from '../models';
import { Person } from '../models/Person';
import { sendResponse, sendError } from '../utils/response';
import { Logger } from '../utils/logger';
import { toObjectId } from '../utils/mongooseHelpers';

const logger = new Logger('profileController');

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    organizationId: string;
    roleId: string;
    permissions: string[];
    isSuperAdmin: boolean;
  };
}

/**
 * Update user profile
 * PUT /api/profile
 */
export const updateProfileController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const { name, githubUsername, admissionYear } = req.body;
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (name) {
      user.name = name;
    }
    
    if (githubUsername !== undefined) {
      user.githubUsername = githubUsername;
    }

    // Admission year validation
    if (admissionYear === undefined || admissionYear === null || admissionYear === '') {
      return sendError(res, 400, 'Admission year is required');
    }

    const year = Number(admissionYear);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
      return sendError(res, 400, 'Admission year must be a valid four-digit year not in the future');
    }

    user.admissionYear = year;
    await user.save();

    // 1. Find Person by userIds link
    let person = await Person.findOne({
      organizationId: toObjectId(req.user.organizationId),
      userIds: toObjectId(req.user.userId),
    });

    // 2. Fallback: Find Person by email
    if (!person && user.email) {
      person = await Person.findOne({
        organizationId: toObjectId(req.user.organizationId),
        primaryEmail: user.email.toLowerCase(),
      });
      if (person) {
        const uId = toObjectId(req.user.userId);
        if (!person.userIds.some((id) => id.equals(uId))) {
          person.userIds.push(uId);
        }
      }
    }

    // 3. Fallback: Create new Person document if none exists yet
    if (!person && user.email) {
      person = new Person({
        organizationId: toObjectId(req.user.organizationId),
        primaryName: user.name,
        primaryEmail: user.email.toLowerCase(),
        admissionYear: year,
        userIds: [toObjectId(req.user.userId)],
      });
    }
    
    if (person) {
      const previousAdmissionYear = person.admissionYear;
      person.admissionYear = year;
      if (user.name) {
        person.primaryName = user.name;
      }
      await person.save();

      if (previousAdmissionYear !== undefined && previousAdmissionYear !== year) {
        logger.warn(`Admission year changed for person ${person._id} from ${previousAdmissionYear} to ${year}.`, { personId: person._id, previousAdmissionYear, newAdmissionYear: year });
      }
    }

    logger.info(`User profile updated for ${user.email}`, { userId: user._id, updatedFields: { name, githubUsername, admissionYear: year } });

    const finalAdmissionYear = person?.admissionYear ?? user.admissionYear ?? year;

    return sendResponse(res, 200, {
      id: user._id,
      name: user.name,
      email: user.email,
      githubUsername: user.githubUsername,
      role: (user.roleId as any)?.name || 'USER',
      admissionYear: finalAdmissionYear,
    }, 'Profile updated successfully');
  } catch (error: any) {
    logger.error('Error updating profile:', error);
    return sendError(res, 500, 'Failed to update profile');
  }
};

/**
 * Get current user profile
 * GET /api/profile
 */
export const getProfileController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Fetch Person for admissionYear and canonical records (by userIds or primaryEmail)
    let person = await Person.findOne({
      organizationId: toObjectId(req.user.organizationId),
      userIds: toObjectId(req.user.userId),
    }).lean();

    if (!person && user.email) {
      person = await Person.findOne({
        organizationId: toObjectId(req.user.organizationId),
        primaryEmail: user.email.toLowerCase(),
      }).lean();
    }

    const certList: Array<{ id: string; name: string; issuer: string; issueDate?: string; status: string }> = [];
    const seenCerts = new Set<string>();

    const addCertItem = (name?: string, issuer?: string, date?: string) => {
      if (!name || !name.trim()) return;
      const key = `${name.trim().toLowerCase()}-${(issuer || '').trim().toLowerCase()}`;
      if (!seenCerts.has(key)) {
        seenCerts.add(key);
        certList.push({
          id: `cert-${seenCerts.size}`,
          name: name.trim(),
          issuer: issuer || 'Verified Issuer',
          issueDate: date || '',
          status: 'Verified',
        });
      }
    };

    if (person) {
      const { CertificateRecord } = await import('../models/CertificateRecord');
      const certRecs = await CertificateRecord.find({
        organizationId: toObjectId(req.user.organizationId),
        personId: person._id,
      }).lean();

      certRecs.forEach((c) => {
        addCertItem(c.title, c.issuer, c.issuedDate ? c.issuedDate.toISOString().split('T')[0] : '');
      });
    }

    try {
      const StudentResume = (await import('../models/StudentResume')).default;
      const resume = await StudentResume.findOne({ userId: req.user.userId }).lean();
      const resumeCerts = Array.isArray(resume?.filledData?.certifications) ? resume.filledData.certifications : [];
      resumeCerts.forEach((rc: any) => {
        addCertItem(rc.certification_name || rc.name || rc.title, rc.certification_issuer || rc.issuer, rc.certification_issue_date || rc.issueDate);
      });
      if (resume?.filledData?.certification_name) {
        addCertItem(resume.filledData.certification_name, resume.filledData.certification_issuer, resume.filledData.certification_issue_date);
      }
    } catch (e) {
      logger.warn('Failed to load resume draft certifications in getProfileController', e);
    }

    const effectiveAdmissionYear = person?.admissionYear ?? user.admissionYear ?? null;

    return sendResponse(res, 200, {
      id: user._id,
      name: user.name,
      email: user.email,
      githubUsername: user.githubUsername,
      linkedinUrl: user.linkedinUrl || '',
      linkedinUsername: user.linkedinUsername || '',
      linkedinConnected: Boolean(user.linkedinConnected),
      linkedinLastUpdated: user.linkedinLastUpdated,
      role: (user.roleId as any)?.name || 'USER',
      admissionYear: effectiveAdmissionYear,
      certifications: certList,
      certificates: certList,
    }, 'Profile retrieved successfully');
  } catch (error: any) {
    logger.error('Error retrieving profile:', error);
    return sendError(res, 500, 'Failed to retrieve profile');
  }
};

/**
 * LinkedIn URL Validator & Username Extractor Helper
 */
export const validateAndExtractLinkedin = (urlInput: string): { valid: boolean; normalizedUrl: string; username: string; error?: string } => {
  if (!urlInput || typeof urlInput !== 'string') {
    return { valid: false, normalizedUrl: '', username: '', error: 'LinkedIn URL is required.' };
  }

  let trimmed = urlInput.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed;
  }

  // Reject non-linkedin domains or non-profile paths
  if (!trimmed.toLowerCase().includes('linkedin.com/in/')) {
    return {
      valid: false,
      normalizedUrl: '',
      username: '',
      error: 'Please provide a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username). Company, job, post, and non-LinkedIn URLs are not allowed.',
    };
  }

  const match = trimmed.match(/^https:\/\/(www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?$/i);
  if (!match || !match[2]) {
    return {
      valid: false,
      normalizedUrl: '',
      username: '',
      error: 'Invalid LinkedIn profile URL format. Expected: https://linkedin.com/in/username',
    };
  }

  const username = match[2];
  const normalizedUrl = `https://www.linkedin.com/in/${username}`;

  return { valid: true, normalizedUrl, username };
};

/**
 * Get LinkedIn Profile Status
 * GET /api/profile/linkedin
 */
export const getLinkedinProfileController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return sendResponse(res, 200, {
      connected: Boolean(user.linkedinConnected),
      url: user.linkedinUrl || '',
      username: user.linkedinUsername || '',
      lastUpdated: user.linkedinLastUpdated || user.updatedAt,
    }, 'LinkedIn profile status retrieved');
  } catch (error: any) {
    logger.error('Error fetching LinkedIn status:', error);
    return sendError(res, 500, 'Failed to fetch LinkedIn status');
  }
};

/**
 * Update / Connect LinkedIn Profile
 * PUT /api/profile/linkedin
 */
export const updateLinkedinProfileController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const { url } = req.body;
    const validation = validateAndExtractLinkedin(url);

    if (!validation.valid) {
      return sendError(res, 400, validation.error || 'Invalid LinkedIn URL');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    user.linkedinUrl = validation.normalizedUrl;
    user.linkedinUsername = validation.username;
    user.linkedinConnected = true;
    user.linkedinLastUpdated = new Date();
    await user.save();

    // Auto-update student's latest resume draft if one exists
    try {
      const StudentResume = (await import('../models/StudentResume')).default;
      await StudentResume.findOneAndUpdate(
        { userId: req.user.userId },
        { $set: { 'filledData.linkedin': validation.normalizedUrl } }
      );
    } catch (e) {
      logger.warn('Failed to sync LinkedIn URL to StudentResume draft', e);
    }

    logger.info(`LinkedIn profile connected for user ${user.email}`, { userId: user._id, linkedinUrl: validation.normalizedUrl });

    return sendResponse(res, 200, {
      connected: true,
      url: validation.normalizedUrl,
      username: validation.username,
      lastUpdated: user.linkedinLastUpdated,
    }, 'LinkedIn profile connected successfully');
  } catch (error: any) {
    logger.error('Error connecting LinkedIn profile:', error);
    return sendError(res, 500, 'Failed to connect LinkedIn profile');
  }
};

/**
 * Disconnect LinkedIn Profile
 * DELETE /api/profile/linkedin
 */
export const disconnectLinkedinProfileController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    user.linkedinUrl = '';
    user.linkedinUsername = '';
    user.linkedinConnected = false;
    user.linkedinLastUpdated = new Date();
    await user.save();

    // Clear LinkedIn URL from latest StudentResume draft if present
    try {
      const StudentResume = (await import('../models/StudentResume')).default;
      await StudentResume.findOneAndUpdate(
        { userId: req.user.userId },
        { $unset: { 'filledData.linkedin': '' } }
      );
    } catch (e) {
      logger.warn('Failed to clear LinkedIn URL from StudentResume draft', e);
    }

    logger.info(`LinkedIn profile disconnected for user ${user.email}`, { userId: user._id });

    return sendResponse(res, 200, {
      connected: false,
      url: '',
      username: '',
      lastUpdated: user.linkedinLastUpdated,
    }, 'LinkedIn profile disconnected successfully');
  } catch (error: any) {
    logger.error('Error disconnecting LinkedIn profile:', error);
    return sendError(res, 500, 'Failed to disconnect LinkedIn profile');
  }
};