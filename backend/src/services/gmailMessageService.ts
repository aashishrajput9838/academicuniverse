import { google } from 'googleapis';
import User from '../models/User';
import { getOAuth2Client, refreshAccessToken } from './gmailAuthService';
import { AuthenticationError, NotFoundError } from '../utils/errors';

interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  senderName: string | null;
  senderEmail: string | null;
  snippet: string;
  receivedAt: string | null;
  isUnread: boolean;
  labels: string[];
}

interface GmailMessageDetail {
  id: string;
  threadId: string;
  subject: string;
  from: string | null;
  to: string | null;
  date: string | null;
  snippet: string;
  bodyText: string;
  labels: string[];
  attachments: Array<{ filename: string; mimeType: string; size: number; attachmentId?: string }>;
}

const MAX_CONCURRENCY = 5;
const MAX_RESULTS = 50;
const DEFAULT_RESULTS = 25;

const normalizeLabelIds = (labelIds: string | string[] | undefined): string[] | undefined => {
  if (!labelIds) return undefined;
  if (Array.isArray(labelIds)) return labelIds.filter(Boolean);
  return labelIds.split(',').map((value) => value.trim()).filter(Boolean);
};

type GmailHeader = { name?: string | null; value?: string | null };

const parseHeader = (headers: Array<GmailHeader>, key: string): string | null => {
  const header = headers.find((h) => h.name?.toLowerCase() === key.toLowerCase());
  return header?.value || null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableGmailError = (error: any): boolean => {
  const status = error?.response?.status || Number(error?.code);
  const message = String(error?.message || '').toLowerCase();
  const retryableStatus = [500, 502, 503, 504];

  if (!retryableStatus.includes(status)) {
    return false;
  }

  if (message.includes('invalid_grant') || message.includes('not connected') || message.includes('gmail account not connected') || message.includes('authentication failed')) {
    return false;
  }

  return true;
};

const getRetryDelay = (error: any, attempt: number): number => {
  const retryAfterHeader = error?.response?.headers?.['retry-after'] || error?.response?.headers?.get?.('retry-after');
  let delayMs = 300 * Math.pow(2, attempt - 1);

  if (retryAfterHeader) {
    const retryAfterValue = Number(retryAfterHeader);
    if (!Number.isNaN(retryAfterValue) && retryAfterValue > 0) {
      delayMs = retryAfterValue * 1000;
    }
  }

  const jitter = Math.floor(Math.random() * 200);
  return delayMs + jitter;
};

const executeGmailRequestWithRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      const status = error?.response?.status || Number(error?.code);
      if (status === 429) {
        throw error;
      }

      if (!isRetryableGmailError(error) || attempt === maxAttempts) {
        throw error;
      }

      const delay = getRetryDelay(error, attempt);
      await sleep(delay);
    }
  }

  return operation();
};

const parseFromHeader = (fromHeader: string | null) => {
  if (!fromHeader) return { senderName: null, senderEmail: null };

  const emailMatch = fromHeader.match(/<([^>]+)>/);
  const address = emailMatch ? emailMatch[1] : fromHeader;
  const namePart = fromHeader.replace(emailMatch?.[0] || '', '').trim().replace(/(^"|"$)/g, '');

  return {
    senderName: namePart || null,
    senderEmail: address || null,
  };
};

const decodeBase64 = (data: string) => {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf-8');
};

const extractPlainTextFromPart = (part: any): string => {
  if (!part) return '';
  let text = '';

  if (part.mimeType === 'text/plain' && part.body?.data) {
    text += decodeBase64(part.body.data);
  }

  if (part.parts && Array.isArray(part.parts)) {
    for (const child of part.parts) {
      text += extractPlainTextFromPart(child);
    }
  }

  return text;
};

const extractHtmlTextFromPart = (part: any): string => {
  if (!part) return '';
  let html = '';

  if (part.mimeType === 'text/html' && part.body?.data) {
    html += decodeBase64(part.body.data);
  }

  if (part.parts && Array.isArray(part.parts)) {
    for (const child of part.parts) {
      html += extractHtmlTextFromPart(child);
    }
  }

  return html;
};

const stripHtml = (html: string) => {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getAuthenticatedGmailClient = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.gmailTokens) {
    throw new AuthenticationError('Gmail account not connected');
  }

  const now = Date.now();
  const isExpired = !user.gmailTokens.expiryDate || user.gmailTokens.expiryDate < now + 5 * 60 * 1000;

  let tokens = user.gmailTokens;

  if (isExpired) {
    try {
      tokens = await refreshAccessToken(userId);
    } catch (error: any) {
      console.error('Failed to refresh Gmail access token:', error);
      if (error.message?.includes('invalid_grant')) {
        const disconnectedUser = await User.findById(userId);
        if (disconnectedUser) {
          disconnectedUser.gmailTokens = undefined;
          await disconnectedUser.save();
        }
      }
      throw new AuthenticationError('Gmail connection expired. Please reconnect your Gmail account.');
    }
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

const fetchMessageMetadata = async (gmail: any, messageId: string): Promise<GmailMessageSummary> => {
  const messageResponse = await executeGmailRequestWithRetry<any>(() => gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',
    metadataHeaders: ['Subject', 'From', 'Date'],
    fields: 'id,threadId,labelIds,snippet,internalDate,payload(headers)',
  }));

  const data = messageResponse.data;
  const headers = data.payload?.headers || [];

  const subject = parseHeader(headers, 'Subject') || '(No Subject)';
  const fromHeader = parseHeader(headers, 'From');
  const dateHeader = parseHeader(headers, 'Date');
  const { senderName, senderEmail } = parseFromHeader(fromHeader);

  const receivedAt = data.internalDate
    ? new Date(Number(data.internalDate)).toISOString()
    : dateHeader
    ? new Date(dateHeader).toISOString()
    : null;

  return {
    id: data.id,
    threadId: data.threadId,
    subject,
    senderName,
    senderEmail,
    snippet: data.snippet || '',
    receivedAt,
    isUnread: Array.isArray(data.labelIds) && data.labelIds.includes('UNREAD'),
    labels: Array.isArray(data.labelIds) ? data.labelIds : [],
  };
};

export const listGmailMessages = async (userId: string, options: { pageToken?: string; maxResults?: number; q?: string; labelIds?: string | string[] }) => {
  const gmail = await getAuthenticatedGmailClient(userId);
  const labelIds = normalizeLabelIds(options.labelIds);
  const maxResults = Math.min(options.maxResults || DEFAULT_RESULTS, MAX_RESULTS);

  const listResponse = await executeGmailRequestWithRetry<any>(() => gmail.users.messages.list({
    userId: 'me',
    maxResults,
    pageToken: options.pageToken,
    q: options.q,
    labelIds,
  }));

  const messages = listResponse.data.messages || [];
  const nextPageToken = listResponse.data.nextPageToken || null;
  const resultSizeEstimate = typeof listResponse.data.resultSizeEstimate === 'number'
    ? listResponse.data.resultSizeEstimate
    : null;

  const messageDetails: Array<GmailMessageSummary> = [];
  let index = 0;
  const workers = new Array(Math.min(MAX_CONCURRENCY, messages.length)).fill(null).map(async () => {
    while (index < messages.length) {
      const currentIndex = index;
      index += 1;
      const message = messages[currentIndex];
      if (!message?.id) continue;
      const metadata = await fetchMessageMetadata(gmail, message.id);
      if (!metadata) {
        throw new Error('Gmail metadata fetch failed');
      }
      messageDetails[currentIndex] = metadata;
    }
  });

  await Promise.all(workers);

  return {
    messages: messageDetails.filter(Boolean),
    nextPageToken,
    resultSizeEstimate,
  };
};

export const getGmailMessage = async (userId: string, messageId: string): Promise<GmailMessageDetail> => {
  const gmail = await getAuthenticatedGmailClient(userId);
  const messageResponse = await executeGmailRequestWithRetry<any>(() => gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
    fields: 'id,threadId,labelIds,snippet,payload(headers,body,parts),internalDate',
  }));

  const data = messageResponse.data;
  const headers = data.payload?.headers || [];

  const subject = parseHeader(headers, 'Subject') || '(No Subject)';
  const from = parseHeader(headers, 'From');
  const to = parseHeader(headers, 'To');
  const dateHeader = parseHeader(headers, 'Date');
  const receivedAt = data.internalDate
    ? new Date(Number(data.internalDate)).toISOString()
    : dateHeader
    ? new Date(dateHeader).toISOString()
    : null;

  const bodyText = extractPlainTextFromPart(data.payload) || stripHtml(extractHtmlTextFromPart(data.payload)) || '';

  const attachments: Array<{ filename: string; mimeType: string; size: number; attachmentId?: string }> = [];

  const collectAttachments = (part: any) => {
    if (!part) return;
    if (part.filename && part.filename.length > 0) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body?.size || 0,
        attachmentId: part.body?.attachmentId,
      });
    }

    if (Array.isArray(part.parts)) {
      part.parts.forEach(collectAttachments);
    }
  };

  collectAttachments(data.payload);

  return {
    id: data.id || '',
    threadId: data.threadId || '',
    subject,
    from,
    to,
    date: receivedAt,
    snippet: data.snippet || '',
    bodyText,
    labels: Array.isArray(data.labelIds) ? data.labelIds : [],
    attachments,
  };
};
