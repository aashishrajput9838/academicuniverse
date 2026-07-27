"use client";

import React, { useMemo } from 'react';
import { AnalysisData } from './AnalysisResult';
import { Trophy, Flame, TrendingUp, Calendar, Award, CheckCircle2, Zap } from 'lucide-react';

interface PersonalProgressDashboardProps {
  history: AnalysisData[];
}

export const PersonalProgressDashboard: React.FC<PersonalProgressDashboardProps> = ({ history }) => {
  const stats = useMemo(() => {
    const totalSessions = history.length;
    if (totalSessions === 0) {
      return {
        totalSessions: 0,
        weeklyPractice: 0,
        monthlyPractice: 0,
        bestScore: 0,
        averageScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        levelName: 'Level 1: Novice Speaker',
        levelNumber: 1,
        progressPercent: 0
      };
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let weeklyPractice = 0;
    let monthlyPractice = 0;
    let scoreSum = 0;
    let maxScore = 0;

    history.forEach(item => {
      const itemDate = item.createdAt ? new Date(item.createdAt) : new Date();
      if (itemDate >= oneWeekAgo) weeklyPractice++;
      if (itemDate >= oneMonthAgo) monthlyPractice++;

      const score = item.overallScore ?? (item.fluencyScore > 10 ? item.fluencyScore : Math.round(item.fluencyScore * 10));
      scoreSum += score;
      if (score > maxScore) maxScore = score;
    });

    const averageScore = Math.round(scoreSum / totalSessions);

    // Calculate streak based on unique practice days
    const uniqueDays = Array.from(
      new Set(
        history.map(item => {
          const d = item.createdAt ? new Date(item.createdAt) : new Date();
          return d.toISOString().split('T')[0];
        })
      )
    ).sort().reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (uniqueDays.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // If practiced today or yesterday, streak is active
      if (uniqueDays[0] === todayStr || uniqueDays[0] === yesterdayStr) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDays.length; i++) {
          const prevDate = new Date(uniqueDays[i - 1]);
          const currDate = new Date(uniqueDays[i]);
          const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate longest streak
      tempStreak = 1;
      longestStreak = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        const prevDate = new Date(uniqueDays[i - 1]);
        const currDate = new Date(uniqueDays[i]);
        const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      }
    }

    // Determine Level based on sessions & average score
    let levelNumber = 1;
    let levelName = 'Level 1: Novice Speaker';
    let progressPercent = Math.min(100, totalSessions * 20);

    if (totalSessions >= 25 && averageScore >= 85) {
      levelNumber = 5;
      levelName = 'Level 5: Placement Keynote Master';
      progressPercent = 100;
    } else if (totalSessions >= 15 && averageScore >= 75) {
      levelNumber = 4;
      levelName = 'Level 4: Executive Placement Presenter';
      progressPercent = Math.min(100, Math.round(((totalSessions - 15) / 10) * 100));
    } else if (totalSessions >= 8 && averageScore >= 65) {
      levelNumber = 3;
      levelName = 'Level 3: Placement Ready Communicator';
      progressPercent = Math.min(100, Math.round(((totalSessions - 8) / 7) * 100));
    } else if (totalSessions >= 3) {
      levelNumber = 2;
      levelName = 'Level 2: Articulate Student Speaker';
      progressPercent = Math.min(100, Math.round(((totalSessions - 3) / 5) * 100));
    }

    return {
      totalSessions,
      weeklyPractice,
      monthlyPractice,
      bestScore: maxScore,
      averageScore,
      currentStreak,
      longestStreak,
      levelName,
      levelNumber,
      progressPercent
    };
  }, [history]);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl mb-8">
      
      {/* Header Level Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Personal AI Progress
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Real-time Analytics
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            {stats.levelName}
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            Keep practicing daily to level up your placement readiness & confidence scores.
          </p>
        </div>

        {/* Level Progress Indicator */}
        <div className="w-full md:w-64 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-semibold">Level {stats.levelNumber} Progress</span>
            <span className="text-purple-400 font-bold">{stats.progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mt-6">
        <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Total Sessions</span>
          <p className="text-xl font-bold text-white flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" /> {stats.totalSessions}
          </p>
        </div>

        <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Weekly Practice</span>
          <p className="text-xl font-bold text-cyan-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" /> {stats.weeklyPractice}
          </p>
        </div>

        <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Monthly Practice</span>
          <p className="text-xl font-bold text-indigo-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-400" /> {stats.monthlyPractice}
          </p>
        </div>

        <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Best Score</span>
          <p className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-emerald-400" /> {stats.bestScore}
          </p>
        </div>

        <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Average Score</span>
          <p className="text-xl font-bold text-purple-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-purple-400" /> {stats.averageScore}
          </p>
        </div>

        <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Current Streak</span>
          <p className="text-xl font-bold text-amber-400 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" /> {stats.currentStreak}d
          </p>
        </div>

        <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">Longest Streak</span>
          <p className="text-xl font-bold text-rose-400 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-400" /> {stats.longestStreak}d
          </p>
        </div>
      </div>
    </div>
  );
};
