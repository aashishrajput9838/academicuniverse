import { apiRequest } from '@/utils/api';

export class CodeArenaService {
  async getDashboardStats() {
    return apiRequest('/api/code-arena/dashboard/stats');
  }

  async getIssues(params: { limit?: number; status?: string; myIssuesOnly?: boolean } = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.status) query.set('status', params.status);
    if (params.myIssuesOnly) query.set('myIssuesOnly', 'true');
    return apiRequest(`/api/code-arena/issues?${query.toString()}`);
  }

  async claimDailyLogin() {
    return apiRequest('/api/code-arena/daily-login', { method: 'POST' });
  }

  async getLeaderboard() {
    return apiRequest('/api/code-arena/leaderboard');
  }

  async getLedger(page: number = 1, limit: number = 20) {
    return apiRequest(`/api/code-arena/ledger?page=${page}&limit=${limit}`);
  }
}

export const codeArenaService = new CodeArenaService();
export default codeArenaService;
