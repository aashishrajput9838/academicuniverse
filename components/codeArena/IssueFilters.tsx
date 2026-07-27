'use client';

import React from 'react';
import { Search, Filter, SlidersHorizontal, Check, RefreshCw } from 'lucide-react';
const ISSUE_CATEGORIES = [
  'Frontend', 'Backend', 'Full Stack', 'Java', 'Python', 'C++',
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express',
  'Spring Boot', 'Android', 'Flutter', 'AI', 'Machine Learning',
  'Data Science', 'Docker', 'DevOps', 'Cloud', 'MongoDB', 'MySQL',
  'PostgreSQL', 'Firebase', 'Git', 'Cyber Security', 'Blockchain',
  'Research', 'Other',
] as const;

interface IssueFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedDifficulty: string;
  onDifficultyChange: (diff: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  activeTab: 'all' | 'my-issues' | 'my-solutions' | 'saved';
  onTabChange: (tab: 'all' | 'my-issues' | 'my-solutions' | 'saved') => void;
  onReset: () => void;
}

export const IssueFilters: React.FC<IssueFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  selectedDifficulty,
  onDifficultyChange,
  sortBy,
  onSortByChange,
  activeTab,
  onTabChange,
  onReset,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl space-y-4">
      {/* Top Bar: Search Input & Quick Tabs */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search issues by title, tech stack, or tags..."
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: 'All Issues' },
            { id: 'my-issues', label: 'My Issues' },
            { id: 'my-solutions', label: 'My Solutions' },
            { id: 'saved', label: 'Saved' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Bar: Dropdown Selects */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
        {/* Category */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {ISSUE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="SOLVED">Solved</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Difficulty</label>
          <select
            value={selectedDifficulty}
            onChange={(e) => onDifficultyChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="EXPERT">Expert</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="createdAt">Newest First</option>
            <option value="rewardAmount">Highest Reward</option>
            <option value="viewCount">Most Viewed</option>
            <option value="solutionCount">Most Submissions</option>
          </select>
        </div>
      </div>
    </div>
  );
};
