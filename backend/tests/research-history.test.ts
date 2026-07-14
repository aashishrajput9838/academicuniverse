jest.mock('../src/config/firebaseAdmin', () => ({
  firebaseFirestore: {
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: 'older',
              data: () => ({ userId: 'user-1', updatedAt: '2024-01-01T00:00:00.000Z' }),
            },
            {
              id: 'newer',
              data: () => ({ userId: 'user-1', updatedAt: '2024-01-02T00:00:00.000Z' }),
            },
          ],
        }),
      })),
    })),
  },
}));

import { ResearchRepository } from '../src/modules/research/research.repository';

describe('ResearchRepository history retrieval', () => {
  it('returns the most recent research documents without needing a composite Firestore index', async () => {
    const repository = new ResearchRepository();

    const history = await repository.findByUserId('user-1', 10);

    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('newer');
    expect(history[1].id).toBe('older');
  });
});
