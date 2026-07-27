'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import { CodeArenaNav } from '@/components/codeArena/CodeArenaNav';
import { LeaderboardTable } from '@/components/codeArena/LeaderboardTable';
import { Trophy, RefreshCw } from 'lucide-react';

export default function LeaderboardPage() {
  const { user, backendUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [arenaPoints, setArenaPoints] = useState(1000);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    }
  }, [user, backendUser, authLoading, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [leaderboardRes, pointsRes] = await Promise.all([
        apiRequest('/api/code-arena/leaderboard?limit=25'),
        apiRequest('/api/code-arena/points/me'),
      ]);

      setLeaderboard(leaderboardRes.data || []);
      setArenaPoints(pointsRes.data?.profile?.arenaPoints ?? 1000);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && backendUser) {
      fetchData();
    }
  }, [user, backendUser]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <CodeArenaNav arenaPoints={arenaPoints} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" /> Developer Leaderboard
          </h1>
          <p className="text-xs text-slate-400">
            Top developers ranked by Total AP Earned, Accepted Solutions, and Verified Reputation
          </p>
        </div>

        {isLoading && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading leaderboard...
          </span>
        )}
      </div>

      {/* Leaderboard Component */}
      <LeaderboardTable leaderboard={leaderboard} currentUserId={backendUser?.id} />
    </div>
  );
}
