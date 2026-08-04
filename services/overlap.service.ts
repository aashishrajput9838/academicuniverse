import { overlapAPI } from '@/utils/api/overlapAPI';
import { SectionsResponse, OverlapResponse } from '@shared-types/overlap';

export class OverlapService {
  async getAvailableSections(organizationId: string): Promise<SectionsResponse> {
    return await overlapAPI.getAvailableSections(organizationId);
  }

  async calculateOverlapSlots(sections: string[], organizationId: string): Promise<OverlapResponse> {
    return await overlapAPI.calculateOverlapSlots(sections, organizationId);
  }

  async testConnection(): Promise<boolean> {
    return await overlapAPI.testConnection();
  }
}

export const overlapService = new OverlapService();
export default overlapService;
