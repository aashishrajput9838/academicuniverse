import { ResearchService } from '../src/modules/research/research.service';

describe('ResearchService (non-AI methods)', () => {
  const mockAI: any = { generateJSON: jest.fn() };

  const sampleRepo = {
    create: jest.fn().mockResolvedValue('new-id-123'),
    update: jest.fn().mockResolvedValue(undefined),
    findByUserId: jest.fn().mockResolvedValue([{ id: 'a', topic: 'T1' }]),
    findById: jest.fn().mockResolvedValue({ id: 'a', topic: 'T1', userId: 'user-1' }),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const service = new ResearchService(mockAI, sampleRepo as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('saveResearch creates new when no id provided', async () => {
    const dto = { topic: 'Topic A', outline: [], content: {}, abstract: '', citations: [] };
    const id = await service.saveResearch('user-1', dto as any);
    expect(id).toBe('new-id-123');
    expect(sampleRepo.create).toHaveBeenCalled();
  });

  test('saveResearch updates when id provided', async () => {
    const dto = { id: 'existing-1', topic: 'Topic B', outline: [], content: {}, abstract: '', citations: [] };
    const id = await service.saveResearch('user-1', dto as any);
    expect(id).toBe('existing-1');
    expect(sampleRepo.update).toHaveBeenCalledWith('existing-1', expect.any(Object));
  });

  test('getResearchHistory returns repository results', async () => {
    const res = await service.getResearchHistory('user-1', 10);
    expect(res).toEqual([{ id: 'a', topic: 'T1' }]);
    expect(sampleRepo.findByUserId).toHaveBeenCalledWith('user-1', 10);
  });

  test('getResearchById returns item', async () => {
    const res = await service.getResearchById('a');
    expect(res).toEqual({ id: 'a', topic: 'T1', userId: 'user-1' });
    expect(sampleRepo.findById).toHaveBeenCalledWith('a');
  });

  test('deleteResearch deletes when owned by user', async () => {
    await expect(service.deleteResearch('user-1', 'a')).resolves.toBeUndefined();
    expect(sampleRepo.delete).toHaveBeenCalledWith('a');
  });

  test('deleteResearch throws when not found', async () => {
    sampleRepo.findById.mockResolvedValueOnce(null);
    await expect(service.deleteResearch('user-1', 'missing')).rejects.toThrow('Research document not found');
  });

  test('deleteResearch throws when unauthorized', async () => {
    sampleRepo.findById.mockResolvedValueOnce({ id: 'b', topic: 'T2', userId: 'other-user' });
    await expect(service.deleteResearch('user-1', 'b')).rejects.toThrow('Unauthorized');
  });
});
