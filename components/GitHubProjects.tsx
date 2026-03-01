import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/utils/api';

interface ProjectStats {
  totalProjects: number;
  projectsCompleted: number;
  projectsOngoing: number;
  githubUsername: string;
  lastUpdated: string;
}

interface GitHubProjectsProps {
  className?: string;
}

const GitHubProjects: React.FC<GitHubProjectsProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProjectStats();
    }
  }, [user]);

  const fetchProjectStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get Firebase ID token
      const token = await user?.getIdToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const data = await apiRequest('/api/github/projects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setStats(data.data);
    } catch (err: any) {
      console.error('Error fetching GitHub projects:', err);
      setError(err.message || 'Failed to load project statistics');
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await user?.getIdToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const data = await apiRequest('/api/github/projects/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setStats(data.data);
    } catch (err: any) {
      console.error('Error refreshing GitHub projects:', err);
      setError(err.message || 'Failed to refresh project statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleSetGitHubUsername = async (githubUsername: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await user?.getIdToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('Updating GitHub username to:', githubUsername);

      // Update the user's GitHub username in the backend
      const updateResponse = await apiRequest('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ githubUsername }),
      });

      console.log('GitHub username updated successfully:', updateResponse);

      // Small delay to ensure the backend has processed the update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch the updated profile to verify the change
      const profileResponse = await apiRequest('/api/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Current profile after update:', profileResponse);

      // Now fetch the project stats again
      const data = await apiRequest('/api/github/projects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Fetched GitHub stats:', data);
      setStats(data.data);
      setError(null); // Clear any previous error
    } catch (err: any) {
      console.error('Error setting GitHub username:', err);
      setError(err.message || 'Failed to set GitHub username');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-700/50 rounded-xl p-4">
                <div className="h-4 bg-slate-600 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-slate-600 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Check if it's a GitHub username not configured error
    if (error.includes('GitHub username not configured')) {
      return (
        <div className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 ${className}`}>
          <div className="text-center">
            <div className="text-amber-400 text-xl mb-2">⚠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">GitHub Username Not Configured</h3>
            <p className="text-slate-300 mb-4">Please enter your GitHub username to connect your projects.</p>
            
            <div className="flex flex-col items-center space-y-4">
              <input
                type="text"
                placeholder="Enter your GitHub username"
                className="px-4 py-2 bg-slate-700 text-white rounded-lg w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSetGitHubUsername((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>('input[type="text"]');
                  if (input && input.value.trim()) {
                    handleSetGitHubUsername(input.value.trim());
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                Connect GitHub
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 ${className}`}>
          <div className="text-center">
            <div className="text-red-400 text-xl mb-2">⚠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">Unable to Load Projects</h3>
            <p className="text-slate-300 mb-4">{error}</p>
            <button
              onClick={fetchProjectStats}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
  }

  if (!stats) {
    return (
      <div className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 ${className}`}>
        <div className="text-center text-slate-400">
          No project data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">GitHub Projects</h2>
        <div className="flex gap-2">
          <button
            onClick={refreshStats}
            disabled={loading}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition disabled:opacity-50"
          >
           🔄 Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Total Projects */}
        <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl p-4 border border-slate-600">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400">📁</span>
            <h3 className="font-medium text-slate-300">Total Projects</h3>
          </div>
          <div className="text-3xl font-bold text-blue-400">
            {stats.totalProjects}
          </div>
        </div>

        {/* Projects Completed */}
        <div className="bg-gradient-to-br from-emerald-700/30 to-emerald-800/30 rounded-xl p-4 border border-emerald-600/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-emerald-400">✅</span>
            <h3 className="font-medium text-slate-300">Completed</h3>
          </div>
          <div className="text-3xl font-bold text-emerald-400">
            {stats.projectsCompleted}
          </div>
        </div>

        {/* Projects Ongoing */}
        <div className="bg-gradient-to-br from-amber-700/30 to-amber-800/30 rounded-xl p-4 border border-amber-600/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400">⚡</span>
            <h3 className="font-medium text-slate-300">Ongoing</h3>
          </div>
          <div className="text-3xl font-bold text-amber-400">
            {stats.projectsOngoing}
          </div>
        </div>
      </div>

      <div className="text-sm text-slate-400 flex justify-between items-center">
        <div>
          GitHub: <span className="text-emerald-400 font-medium">@{stats.githubUsername}</span>
        </div>
        <div>
          Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default GitHubProjects;