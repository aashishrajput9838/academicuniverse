import { scrubPII, createResumeLogger, logStageEntry, logStageExit, logStateTransition } from '../utils/structuredLogging';

jest.mock('../utils/logger');

describe('structuredLogging', () => {
  describe('scrubPII', () => {
    test('redacts email field', () => {
      const meta = { email: 'john@example.com', stage: 'classification' };
      const result = scrubPII(meta);
      expect(result.email).toBe('[REDACTED]');
      expect(result.stage).toBe('classification');
    });

    test('redacts phone field', () => {
      const meta = { phone: '+1-555-0199', processingId: 'proc1' };
      const result = scrubPII(meta);
      expect(result.phone).toBe('[REDACTED]');
      expect(result.processingId).toBe('proc1');
    });

    test('redacts rawEmail and rawPhone fields', () => {
      const meta = { rawEmail: 'john@example.com', rawPhone: '+1-555-0199' };
      const result = scrubPII(meta);
      expect(result.rawEmail).toBe('[REDACTED]');
      expect(result.rawPhone).toBe('[REDACTED]');
    });

    test('handles null and undefined', () => {
      expect(scrubPII(null)).toBeNull();
      expect(scrubPII(undefined)).toBeUndefined();
      expect(scrubPII('string')).toBe('string');
    });

    test('does not modify original object', () => {
      const meta = { email: 'john@example.com' };
      scrubPII(meta);
      expect(meta.email).toBe('john@example.com');
    });
  });

  describe('createResumeLogger', () => {
    test('creates a Logger instance', () => {
      const logger = createResumeLogger('TestService');
      expect(logger).toBeDefined();
    });
  });

  describe('logStageEntry', () => {
    test('logs stage entry with correct keys', () => {
      const logger = createResumeLogger('TestService');
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      
      logStageEntry(logger, 'classification', { processingId: 'proc1', organizationId: 'org1' });
      
      expect(infoSpy).toHaveBeenCalledWith(
        '[classification] START',
        expect.objectContaining({
          stage: 'classification',
          status: 'START',
          processingId: 'proc1',
          organizationId: 'org1',
        })
      );
    });

    test('scrubs PII from entry log', () => {
      const logger = createResumeLogger('TestService');
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      
      logStageEntry(logger, 'classification', { email: 'john@example.com', phone: '+1-555-0199' });
      
      const loggedMeta = (infoSpy.mock.calls[0][1] as any);
      expect(loggedMeta.email).toBe('[REDACTED]');
      expect(loggedMeta.phone).toBe('[REDACTED]');
    });
  });

  describe('logStageExit', () => {
    test('logs stage exit with duration', () => {
      const logger = createResumeLogger('TestService');
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      
      logStageExit(logger, 'classification', { processingId: 'proc1' }, 120);
      
      expect(infoSpy).toHaveBeenCalledWith(
        '[classification] SUCCESS',
        expect.objectContaining({
          stage: 'classification',
          status: 'SUCCESS',
          durationMs: 120,
          processingId: 'proc1',
        })
      );
    });
  });

  describe('logStateTransition', () => {
    test('logs state transition with correct keys', () => {
      const logger = createResumeLogger('TestService');
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      
      logStateTransition(logger, 'dicRoutedAt', { processingId: 'proc1' });
      
      expect(infoSpy).toHaveBeenCalledWith(
        'ResumeParseResult state transition: dicRoutedAt',
        expect.objectContaining({
          state: 'dicRoutedAt',
          processingId: 'proc1',
        })
      );
    });
  });
});
