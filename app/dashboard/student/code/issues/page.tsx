'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import { CodeArenaNav } from '@/components/codeArena/CodeArenaNav';
import { IssueFilters } from '@/components/codeArena/IssueFilters';
import { IssueCard } from '@/components/codeArena/IssueCard';
import { PlusCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function BrowseIssuesPage() {
  const { user, backendUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [issues, setIssues] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [activeTab, setActiveTab] = useState<'all' | 'my-issues' | 'my-solutions' | 'saved'>('all');

  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    }
  }, [user, backendUser, authLoading, router]);

  // Initial tab from query param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'my-issues' || tabParam === 'my-solutions' || tabParam === 'saved') {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const fetchWallet = async () => {
    try {
      const res = await apiRequest('/api/code-arena/wallet/me');
      setWalletBalance(res.data?.balance || 0);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  };

  const fetchIssues = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '12');
      params.set('sortBy', sortBy);

      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      if (difficulty) params.set('difficulty', difficulty);

      if (activeTab === 'my-issues') params.set('myIssuesOnly', 'true');
      if (activeTab === 'my-solutions') params.set('mySolutionsOnly', 'true');
      if (activeTab === 'saved') params.set('savedOnly', 'true');

      const res = await apiRequest(`/api/code-arena/issues?${params.toString()}`);
      setIssues(res.data?.issues || []);
      setTotal(res.data?.total || 0);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && backendUser) {
      fetchWallet();
    }
  }, [user, backendUser]);

  useEffect(() => {
    if (user && backendUser) {
      fetchIssues();
    }
  }, [user, backendUser, page, searchQuery, category, status, difficulty, sortBy, activeTab]);

  const handleToggleSave = async (issueId: string) => {
    try {
      await apiRequest(`/api/code-arena/issues/${issueId}/save`, { method: 'POST' });
      fetchIssues();
    } catch (err) {
      console.error('Failed to toggle save:', err);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('');
    setStatus('');
    setDifficulty('');
    setSortBy('createdAt');
    setActiveTab('all');
    setPage(1);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <CodeArenaNav walletBalance={walletBalance} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Browse Technical Issues</h1>
          <p className="text-xs text-slate-400">Explore open developer issues, submit solutions, and earn escrow rewards</p>
        </div>

        <Link
          href="/dashboard/student/code/issues/new"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" /> Post New Issue
        </Link>
      </div>

      {/* Filters Component */}
      <IssueFilters
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        selectedCategory={category}
        onCategoryChange={(cat) => {
          setCategory(cat);
          setPage(1);
        }}
        selectedStatus={status}
        onStatusChange={(st) => {
          setStatus(st);
          setPage(1);
        }}
        selectedDifficulty={difficulty}
        onDifficultyChange={(df) => {
          setDifficulty(df);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={(sb) => setSortBy(sb)}
        activeTab={activeTab}
        onTabChange={(tb) => {
          setActiveTab(tb);
          setPage(1);
        }}
        onReset={handleResetFilters}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{issues.length}</strong> of{' '}
          <strong className="text-white">{total}</strong> issues
        </span>
        {isLoading && (
          <span className="flex items-center gap-1 text-emerald-400">
            <RefreshCw className="w-3 h-3 animate-spin" /> Loading...
          </span>
        )}
      </div>

      {/* Issues Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 bg-slate-800/60 rounded-2xl animate-pulse border border-slate-700/50" />
          ))}
        </div>
      ) : issues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {issues.map((issue) => (
            <IssueCard
              key={issue._id}
              issue={issue}
              currentUserId={backendUser?.id}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 space-y-3">
          <p className="text-sm font-semibold text-white">No issues found</p>
          <p className="text-xs text-slate-500">Try adjusting your search keywords or filter options.</p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-emerald-400 font-semibold hover:bg-slate-700 transition"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400">
            Page <strong className="text-white">{page}</strong> of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
