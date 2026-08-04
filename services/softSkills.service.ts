import { apiRequest } from '@/utils/api';
import { AnalysisData } from '@shared-types/soft-skills';

export class SoftSkillsService {
  /**
   * Submit a sentence for AI evaluation.
   * Returns the structured AnalysisData from the backend.
   */
  async improveSentence(originalSentence: string, practiceMode: string = 'General Practice'): Promise<AnalysisData> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) throw new Error('No authentication token found');

    const res = await apiRequest('/api/softskills/improve', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ originalSentence, practiceMode }),
    });

    return res.analysis as AnalysisData;
  }

  /**
   * Retrieve the user's practice history from Firestore.
   */
  async getHistory(): Promise<AnalysisData[]> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) throw new Error('No authentication token found');

    const res = await apiRequest('/api/softskills/history', {
      headers: { Authorization: `Bearer ${token}` },
    });

    return (res.data?.history || res.history || []) as AnalysisData[];
  }
}

export const softSkillsService = new SoftSkillsService();
export default softSkillsService;
