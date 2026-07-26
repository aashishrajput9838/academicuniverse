import { Response, NextFunction } from 'express';

const mockSendResponse = jest.fn();
const mockSendError = jest.fn();
const mockNext = jest.fn();

jest.mock('../utils/response', () => ({
  sendResponse: (...args: any[]) => mockSendResponse(...args),
  sendError: (...args: any[]) => mockSendError(...args),
}));

const mockApplyPersonOverride = jest.fn();
const mockGetPersonSuggestion = jest.fn();
const mockGetCandidateState = jest.fn();

jest.mock('../shared/services/review.service', () => {
  const mockService = {
    applyPersonOverride: mockApplyPersonOverride,
    getPersonSuggestion: mockGetPersonSuggestion,
    getCandidateState: mockGetCandidateState,
  };
  return {
    ReviewService: jest.fn(() => mockService),
    reviewService: mockService,
  };
});

import {
  overridePerson,
  getSuggestion,
  getRoutingInfo,
} from '../controllers/reviewController';

describe('ReviewController M2', () => {
  const mockReq = {
    params: { processingId: 'proc1' },
    body: {},
    user: { userId: 'user1', role: 'FACULTY', organizationId: 'org1' },
    organizationId: 'org1',
  } as any;
  const mockRes = {} as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('overridePerson', () => {
    it('should apply person override and return success', async () => {
      mockReq.body = { suggestedPersonId: 'person1', expectedVersion: 1 };
      mockApplyPersonOverride.mockResolvedValue({
        suggestion: { processingId: 'proc1' },
        version: 2,
      });

      await overridePerson(mockReq, mockRes, mockNext);

      expect(mockApplyPersonOverride).toHaveBeenCalledWith({
        processingId: 'proc1',
        organizationId: 'org1',
        reviewer: { userId: 'user1', role: 'FACULTY', organizationId: 'org1' },
        suggestedPersonId: 'person1',
        expectedVersion: 1,
        idempotencyKey: undefined,
      });
      expect(mockSendResponse).toHaveBeenCalledWith(mockRes, 200, { suggestion: { processingId: 'proc1' }, version: 2 }, 'Person override applied successfully');
    });

    it('should return 400 when suggestedPersonId is missing', async () => {
      mockReq.body = { expectedVersion: 1 };

      await overridePerson(mockReq, mockRes, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 400, 'suggestedPersonId is required');
      expect(mockApplyPersonOverride).not.toHaveBeenCalled();
    });

    it('should return 400 when expectedVersion is not a number', async () => {
      mockReq.body = { suggestedPersonId: 'person1', expectedVersion: 'abc' };

      await overridePerson(mockReq, mockRes, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 400, 'expectedVersion must be a number');
      expect(mockApplyPersonOverride).not.toHaveBeenCalled();
    });

    it('should return 400 when expectedVersion is missing', async () => {
      mockReq.body = { suggestedPersonId: 'person1' };

      await overridePerson(mockReq, mockRes, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 400, 'expectedVersion must be a number');
      expect(mockApplyPersonOverride).not.toHaveBeenCalled();
    });

    it('should return 409 on version conflict', async () => {
      mockReq.body = { suggestedPersonId: 'person1', expectedVersion: 1 };
      mockApplyPersonOverride.mockRejectedValue(
        new Error('Conflict: version mismatch. Expected 1, got 2')
      );

      await overridePerson(mockReq, mockRes, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 409, 'Conflict: version mismatch. Expected 1, got 2');
    });

    it('should return 403 on Forbidden error', async () => {
      mockReq.body = { suggestedPersonId: 'person1', expectedVersion: 1 };
      mockApplyPersonOverride.mockRejectedValue(
        new Error('Forbidden: target person not found in organization')
      );

      await overridePerson(mockReq, mockRes, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 403, 'Forbidden: target person not found in organization');
    });

    it('should return 404 on not found', async () => {
      mockReq.body = { suggestedPersonId: 'person1', expectedVersion: 1 };
      mockApplyPersonOverride.mockRejectedValue(
        new Error('ResumePersonSuggestion not found for processingId: proc1')
      );

      await overridePerson(mockReq, mockRes, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 404, 'ResumePersonSuggestion not found for processingId: proc1');
    });
  });

  describe('getSuggestion', () => {
    it('should return person suggestion when found', async () => {
      const mockSuggestion = { processingId: 'proc1', matchBasis: ['email'], version: 1 };
      mockGetPersonSuggestion.mockResolvedValue(mockSuggestion);

      await getSuggestion(mockReq, mockRes, mockNext);

      expect(mockGetPersonSuggestion).toHaveBeenCalledWith('proc1', 'org1');
      expect(mockSendResponse).toHaveBeenCalledWith(mockRes, 200, mockSuggestion, 'Person suggestion retrieved');
    });

    it('should return 404 when suggestion not found', async () => {
      mockGetPersonSuggestion.mockResolvedValue(null);

      await getSuggestion(mockReq, mockRes, mockNext);

      expect(mockSendError).toHaveBeenCalledWith(mockRes, 404, 'ResumePersonSuggestion not found for processingId: proc1');
    });
  });

  describe('getRoutingInfo', () => {
    it('should include personSuggestion in response', async () => {
      const mockState = { processingId: 'proc1', routingDecision: null };
      const mockSuggestion = { processingId: 'proc1', matchBasis: ['email'], version: 1 };
      mockGetCandidateState.mockResolvedValue(mockState);
      mockGetPersonSuggestion.mockResolvedValue(mockSuggestion);

      jest.doMock('../shared/application/routingEngine', () => ({
        moduleRegistry: [],
      }));

      await getRoutingInfo(mockReq, mockRes, mockNext);

      expect(mockSendResponse).toHaveBeenCalledWith(
        mockRes,
        200,
        expect.objectContaining({
          processingId: 'proc1',
          personSuggestion: mockSuggestion,
        }),
        'Routing info retrieved'
      );
    });

    it('should include null personSuggestion when none exists', async () => {
      const mockState = { processingId: 'proc1', routingDecision: null };
      mockGetCandidateState.mockResolvedValue(mockState);
      mockGetPersonSuggestion.mockResolvedValue(null);

      jest.doMock('../shared/application/routingEngine', () => ({
        moduleRegistry: [],
      }));

      await getRoutingInfo(mockReq, mockRes, mockNext);

      expect(mockSendResponse).toHaveBeenCalledWith(
        mockRes,
        200,
        expect.objectContaining({
          processingId: 'proc1',
          personSuggestion: null,
        }),
        'Routing info retrieved'
      );
    });
  });
});
