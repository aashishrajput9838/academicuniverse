export interface ArenaPointTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reason: string;
  referenceId?: string;
  createdAt: string;
}

export interface UserBalance {
  apBalance: number;
  dailyStreak: number;
  lastLoginDate?: string;
}
