'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useSkillsStore } from './store/skillsStore';
import { useModuleRefresh } from '@/hooks/useModuleRefresh';
import { SkillCard } from './components/SkillCard';
import { SkillDetailPanel } from './components/SkillDetailPanel';
import { AddSkillsModal } from './components/AddSkillsModal';
import { EditSkillModal } from './components/EditSkillModal';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  AlertTriangle,
  Sparkles,
  Filter,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { SkillRecordDTO, SkillCategory, ProficiencyLevel } from './types/skills';
import { cn } from '@/lib/utils';

const categoryLabels: Record<SkillCategory, string> = {
  TECHNICAL: 'Technical',
  SOFT: 'Soft Skills',
  LANGUAGE: 'Language',
  TOOL: 'Tools',
  DOMAIN_SPECIFIC: 'Domain Specific',
};

const categoryColors: Record<SkillCategory, string> = {
  TECHNICAL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SOFT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  LANGUAGE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  TOOL: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  DOMAIN_SPECIFIC: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

export default function StudentSkillsTracker() {
  const { user, backendUser, backendToken, loading: authLoading } = useAuth();
  const router = useRouter();
  const { profile, summary, selectedSkill, selectedSkillDetail, loading, detailLoading, error, lastFetchedAt, refresh, setSelectedSkill, loadDetail } = useSkillsStore();
  const [filterCategory, setFilterCategory] = useState<SkillCategory | 'ALL'>('ALL');
  const [filterLevel, setFilterLevel] = useState<ProficiencyLevel | 'ALL'>('ALL');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillRecordDTO | null>(null);
  const [recruiterSkill, setRecruiterSkill] = useState<SkillRecordDTO | null>(null);

  const existingSkillIds = useMemo(() => {
    return new Set(profile?.skills?.map((s) => s.skillId.toLowerCase()) || []);
  }, [profile]);

  const handleRefresh = useCallback(() => {
    if (backendToken) refresh(backendToken);
  }, [backendToken, refresh]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_CONNECTED') {
        if (backendToken) {
          setSyncing(true);
          setSyncStatus('Syncing GitHub repositories...');
          try {
            const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5003'}/api/github/sync`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${backendToken}`,
              },
            });

            if (syncResponse.ok) {
              await refresh(backendToken);
              setSyncStatus('GitHub connected successfully.');
            } else {
              setSyncStatus('GitHub connected successfully, but repository synchronization failed.');
            }
          } catch (err) {
            console.error('GitHub sync failed:', err);
            setSyncStatus('GitHub connected successfully, but repository synchronization failed.');
          } finally {
            setSyncing(false);
            setTimeout(() => setSyncStatus(null), 5000);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [backendToken, refresh]);

  useModuleRefresh(['skills'], handleRefresh);

  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!authLoading && backendUser && backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY') {
      router.push('/');
    }
  }, [user, backendUser, authLoading, router]);

  useEffect(() => {
    if (!backendToken || !user || !backendUser || backendUser.role !== 'STUDENT') {
      return;
    }
    refresh(backendToken);
  }, [backendToken, backendUser, user, refresh]);

  const handleSkillSelect = async (skill: SkillRecordDTO) => {
    setSelectedSkill(skill);
    if (backendToken && skill.skillId) {
      await loadDetail(backendToken, skill.skillId);
    }
  };

  const filteredSkills = useMemo(() => {
    if (!profile?.skills) return [];
    let skills = profile.skills;
    if (filterCategory !== 'ALL') {
      skills = skills.filter(s => s.skillCategory === filterCategory);
    }
    if (filterLevel !== 'ALL') {
      skills = skills.filter(s => s.proficiencyLevel === filterLevel);
    }
    return [...skills].sort((a, b) => b.proficiencyScore - a.proficiencyScore);
  }, [profile, filterCategory, filterLevel]);

  const categories = useMemo(() => {
    if (!profile?.categories) return [];
    return Object.entries(profile.categories).map(([key, value]) => ({
      category: key as SkillCategory,
      count: value.count,
      averageScore: value.averageScore,
    }));
  }, [profile]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  if (!user || !backendUser || backendUser.role !== 'STUDENT') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Skills Intelligence</h1>
            <p className="text-slate-400">Evidence-backed view of your skills and proficiencies</p>
            {lastFetchedAt && (
              <p className="text-slate-500 text-xs mt-1">
                Last updated: {lastFetchedAt.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/30"
            >
              <Plus className="w-4 h-4" />
              ✨ Add Core Skills
            </button>
            <button
              onClick={() => backendToken && refresh(backendToken)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium transition-colors border border-emerald-500/20 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {syncStatus && (
          <div className={`px-4 py-3 rounded-lg border ${
            syncing
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            <p className="text-sm font-medium flex items-center gap-2">
              {syncing && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
              )}
              {syncStatus}
            </p>
          </div>
        )}

        {/* Summary Stats */}
        {!loading && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Award className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{summary.totalSkills}</div>
                  <div className="text-slate-400 text-xs">Total Skills</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{Object.keys(summary.categories).length}</div>
                  <div className="text-slate-400 text-xs">Categories</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{summary.topSkills.length}</div>
                  <div className="text-slate-400 text-xs">Top Skills</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{summary.skillGaps.length}</div>
                  <div className="text-slate-400 text-xs">Skill Gaps</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-slate-900/50 rounded-xl p-5 border border-slate-700 animate-pulse">
                <div className="h-5 w-32 bg-slate-700 rounded mb-3" />
                <div className="h-3 w-24 bg-slate-700 rounded mb-4" />
                <div className="w-full bg-slate-700 rounded-full h-2 mb-4" />
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-slate-700 rounded" />
                  <div className="h-3 w-16 bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <ErrorState message={error} onRetry={() => backendToken && refresh(backendToken)} />
        )}

        {/* Empty State */}
        {!loading && !error && filteredSkills.length === 0 && profile && (
          <EmptyState onRetry={() => backendToken && refresh(backendToken)} syncing={syncing} />
        )}

        {/* Main Content */}
        {!loading && !error && filteredSkills.length > 0 && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as SkillCategory | 'ALL')}
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {categoryLabels[cat.category]} ({cat.count})
                  </option>
                ))}
              </select>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as ProficiencyLevel | 'ALL')}
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="ALL">All Levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="EXPERT">Expert</option>
              </select>
              <div className="ml-auto text-slate-400 text-sm">
                Showing {filteredSkills.length} of {profile?.skills?.length || 0} skills
              </div>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onSelect={handleSkillSelect}
                  onEdit={(s) => setEditingSkill(s)}
                  isSelected={selectedSkill?.id === skill.id}
                />
              ))}
            </div>
          </>
        )}

        {/* Skill Detail Panel */}
        {selectedSkill && (
          <SkillDetailPanel
            skill={selectedSkill}
            detail={selectedSkillDetail}
            detailLoading={detailLoading}
            onClose={() => setSelectedSkill(null)}
          />
        )}

        {/* Add Skills Modal */}
        <AddSkillsModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          backendToken={backendToken || ''}
          existingSkillIds={existingSkillIds}
          onSuccess={() => backendToken && refresh(backendToken)}
        />

        {/* Edit / Delete Skill Modal */}
        <EditSkillModal
          skill={editingSkill}
          isOpen={Boolean(editingSkill)}
          onClose={() => setEditingSkill(null)}
          backendToken={backendToken || ''}
          onSuccess={() => backendToken && refresh(backendToken)}
        />

        {/* Recruiter Proof Report Modal */}
        <RecruiterViewModal
          skill={recruiterSkill}
          onClose={() => setRecruiterSkill(null)}
        />
      </div>
    </div>
  );
}
