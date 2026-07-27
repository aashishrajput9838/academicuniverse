'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import { CodeArenaNav } from '@/components/codeArena/CodeArenaNav';
import { CodeArenaStatsBar } from '@/components/codeArena/CodeArenaStatsBar';
import { ArenaPointsCard } from '@/components/codeArena/ArenaPointsCard';
import { IssueCard } from '@/components/codeArena/IssueCard';
import Link from 'next/link';
import { PlusCircle, Compass, Award, ArrowRight, Flame, Trophy } from 'lucide-react';

export default function CodeArenaDashboard() {
  const { user, backendUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [myIssues, setMyIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    }
  }, [user, backendUser, authLoading, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, recentRes, myIssuesRes] = await Promise.all([
        apiRequest('/api/code-arena/dashboard/stats'),
        apiRequest('/api/code-arena/issues?limit=6&status=OPEN'),
        apiRequest('/api/code-arena/issues?limit=4&myIssuesOnly=true'),
      ]);

      setStats(statsRes.data);
      setRecentIssues(recentRes.data?.issues || []);
      setMyIssues(myIssuesRes.data?.issues || []);
    } catch (err) {
      console.error('Failed to load Code Arena dashboard data:', err);
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

  if (!user || !backendUser || backendUser.role !== 'STUDENT') {
    return null;
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Navigation Header */}
      <CodeArenaNav arenaPoints={stats?.myPointsProfile?.arenaPoints || 1000} />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/50 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
            <Flame className="w-3.5 h-3.5" /> Peer-to-Peer Developer Community & AP Economy
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Solve Technical Issues. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-300">
              Earn Arena Points (AP) & Badges.
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
            Need help debugging a project? Post your issue with Arena Points or request free Community Help. Solve issues to earn AP, climb the developer leaderboard, and unlock verified reputation badges!
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/student/code/issues/new"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Post an Issue
            </Link>

            <Link
              href="/dashboard/student/code/issues"
              className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs transition flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-emerald-400" /> Browse Open Issues
            </Link>

            <Link
              href="/dashboard/student/code/leaderboard"
              className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-amber-400 font-semibold text-xs transition flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Stats Bar */}
      <CodeArenaStatsBar
        openIssues={stats?.openIssues}
        solvedToday={stats?.solvedToday}
        activeDevelopers={stats?.activeDevelopers}
        totalRewardPool={stats?.totalRewardPool}
        isLoading={isLoading}
      />

      {/* Main Grid: AP Card + Recent Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Arena Points Card & Badges */}
        <div className="space-y-6">
          <ArenaPointsCard
            arenaPoints={stats?.myPointsProfile?.arenaPoints}
            totalEarned={stats?.myPointsProfile?.totalEarned}
            totalSpent={stats?.myPointsProfile?.totalSpent}
            loginStreak={stats?.dailyRewardStatus?.currentStreak}
            claimedToday={stats?.dailyRewardStatus?.claimedToday}
            isNewUser={stats?.isNewUser}
            onClaimSuccess={fetchData}
          />

          {/* Reputation & Badges Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" /> Reputation Badges
              </h3>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                {stats?.myPointsProfile?.totalPoints || 0} PTS
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-4">
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Issues Solved</span>
                <span className="font-bold text-white text-base">{stats?.myPointsProfile?.issuesSolved || 0}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Acceptance Rate</span>
                <span className="font-bold text-emerald-400 text-base">{stats?.myPointsProfile?.acceptanceRate || 0}%</span>
              </div>
            </div>

            {stats?.myPointsProfile?.badges && stats.myPointsProfile.badges.length > 0 ? (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Earned Badges</span>
                <div className="flex flex-wrap gap-1.5">
                  {stats.myPointsProfile.badges.map((badge: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold"
                    >
                      🏆 {badge.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Submit your first solution to earn developer badges!</p>
            )}
          </div>
        </div>

        {/* Right Column: Open Issues Feed */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Trending Open Issues</h3>
                <p className="text-xs text-slate-400">Help peers solve technical issues & earn AP rewards</p>
              </div>

              <Link
                href="/dashboard/student/code/issues"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-44 bg-slate-800/60 rounded-2xl animate-pulse border border-slate-700/50" />
                ))}
              </div>
            ) : recentIssues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentIssues.map((issue) => (
                  <IssueCard key={issue._id} issue={issue} currentUserId={backendUser?.id} />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400">
                <p className="text-xs">No open issues at the moment.</p>
                <Link
                  href="/dashboard/student/code/issues/new"
                  className="inline-block mt-3 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  Be the first to post an issue!
                </Link>
              </div>
            )}
          </div>

          {myIssues.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">My Posted Issues</h3>
                <Link
                  href="/dashboard/student/code/issues?tab=my-issues"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition"
                >
                  Manage <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myIssues.map((issue) => (
                  <IssueCard key={issue._id} issue={issue} currentUserId={backendUser?.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}