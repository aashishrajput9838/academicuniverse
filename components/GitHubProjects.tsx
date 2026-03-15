import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

interface ProjectStats {
  totalProjects: number;
  projectsCompleted: number;
  projectsOngoing: number;
  githubUsername: string;
  lastUpdated: string;
}

interface DeveloperStats {
  totalRepos: number;
  totalPrivateRepos: number;
  totalPublicRepos: number;
  topLanguage: string | null;
  languageDistribution: Record<string, number>;
  totalCommits: number;
  lastActiveDate: string | null;
  repoGrowthTrend: number;
  avgRepoSize: number;
  totalStars: number;
  totalForks: number;
  totalWatchers: number;
  primaryLanguageRepos: number;
  updated_at: string;
}

interface GitHubProjectsProps {
  className?: string;
}

const GitHubProjects: React.FC<GitHubProjectsProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [developerStats, setDeveloperStats] = useState<DeveloperStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Listen for GitHub OAuth messages
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data.type === 'GITHUB_CONNECTED') {
        toast({
          title: "Success",
          description: event.data.message || "GitHub account connected successfully!",
        });
        fetchProjectStats();
      } else if (event.data.type === 'GITHUB_CONNECT_ERROR') {
        toast({
          title: "Error",
          description: event.data.error || "Failed to connect GitHub account",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [toast]);

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

      // Try to fetch the new analytics first (only if user has connected GitHub OAuth)
      try {
        const devData = await apiRequest('/api/github/stats', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        // Only set developer stats if we actually got data back
        if (devData.data !== null) {
          setDeveloperStats(devData.data);
        }
      } catch (analyticsErr: any) {
        // Handle the specific "GitHub access token" error gracefully
        if (analyticsErr.message && analyticsErr.message.includes('Failed to retrieve developer statistics')) {
          // This is expected when user hasn't connected OAuth - don't show as error
          console.info('Developer analytics not available - user may not have connected GitHub OAuth');
        } else {
          // Log other errors as warnings
          console.warn('Failed to fetch developer stats:', analyticsErr);
        }
        // Don't set error state for this - it's optional functionality
      }

      // Also fetch the legacy project stats
      try {
        const data = await apiRequest('/api/github/projects', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setStats(data.data);
      } catch (legacyErr: any) {
        if (legacyErr.message && legacyErr.message.toLowerCase().includes('not found')) {
          console.info('GitHub projects not linked');
        } else {
          throw legacyErr;
        }
      }
    } catch (err: any) {
      if (!err.message?.includes('GitHub username not configured')) {
        console.error('Error fetching GitHub projects:', err);
      }
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

  const handleConnectGitHubOAuth = async () => {
    try {
      // Get Firebase ID token
      const token = await user?.getIdToken();

      if (!token) {
        throw new Error('Authentication required');
      }

      // Open GitHub OAuth in a popup
      const popup = window.open(
        '/api/github/connect',
        'github-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Monitor the popup for messages
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GITHUB_CONNECTED') {
          toast({
            title: "Success",
            description: event.data.message || "GitHub account connected successfully!",
          });
          fetchProjectStats();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'GITHUB_CONNECT_ERROR') {
          toast({
            title: "Error",
            description: event.data.error || "Failed to connect GitHub account",
            variant: "destructive",
          });
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to initiate GitHub OAuth",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      const token = await user?.getIdToken();

      if (!token) {
        throw new Error('Authentication required');
      }

      await apiRequest('/api/github/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setDeveloperStats(null);
      setStats(null);

      toast({
        title: "Success",
        description: "GitHub account disconnected successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to disconnect GitHub account",
        variant: "destructive",
      });
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
            <h3 className="text-lg font-semibold text-white mb-2">GitHub Connection Required</h3>
            <p className="text-slate-300 mb-4">Connect your GitHub account to view your project statistics.</p>

            <div className="flex flex-col items-center space-y-4">
              <div className="text-center">
                <div className="text-amber-400 text-xl mb-2">⚠️</div>
                <h3 className="text-lg font-semibold text-white mb-2">Connect GitHub for Advanced Analytics</h3>
                <p className="text-slate-300 mb-4">
                  Connect your GitHub account to unlock detailed developer statistics including:
                </p>
                <ul className="text-slate-400 text-sm mb-4 text-left max-w-md mx-auto">
                  <li className="mb-1">• Total repositories and private/public breakdown</li>
                  <li className="mb-1">• Top programming languages</li>
                  <li className="mb-1">• Star and fork counts</li>
                  <li className="mb-1">• Repository growth trends</li>
                </ul>
                <button
                  onClick={handleConnectGitHubOAuth}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Connect with GitHub OAuth
                </button>
              </div>
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
            <div className="flex justify-center gap-2">
              <button
                onClick={fetchProjectStats}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                Try Again
              </button>
              <button
                onClick={handleConnectGitHubOAuth}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Connect GitHub
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  if (!stats && !developerStats) {
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
          {developerStats && (
            <button
              onClick={handleDisconnectGitHub}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Disconnect
            </button>
          )}
          <button
            onClick={refreshStats}
            disabled={loading}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Enhanced developer stats if available */}
      {developerStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Total Repos */}
          <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl p-4 border border-slate-600">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400">📁</span>
              <h3 className="font-medium text-slate-300">Total Repos</h3>
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {developerStats.totalRepos}
            </div>
          </div>

          {/* Private Repos */}
          <div className="bg-gradient-to-br from-purple-700/30 to-purple-800/30 rounded-xl p-4 border border-purple-600/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-400">🔒</span>
              <h3 className="font-medium text-slate-300">Private</h3>
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {developerStats.totalPrivateRepos}
            </div>
          </div>

          {/* Top Language */}
          <div className="bg-gradient-to-br from-emerald-700/30 to-emerald-800/30 rounded-xl p-4 border border-emerald-600/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-emerald-400">💻</span>
              <h3 className="font-medium text-slate-300">Top Language</h3>
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {developerStats.topLanguage || 'N/A'}
            </div>
          </div>

          {/* Total Stars */}
          <div className="bg-gradient-to-br from-yellow-700/30 to-yellow-800/30 rounded-xl p-4 border border-yellow-600/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-400">⭐</span>
              <h3 className="font-medium text-slate-300">Stars</h3>
            </div>
            <div className="text-3xl font-bold text-yellow-400">
              {developerStats.totalStars}
            </div>
          </div>
        </div>
      )}

      {/* Legacy stats if available */}
      {stats && (
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
      )}

      <div className="text-sm text-slate-400 flex justify-between items-center">
        <div>
          GitHub: <span className="text-emerald-400 font-medium">@{stats?.githubUsername || 'N/A'}</span>
        </div>
        <div>
          {stats && `Last updated: ${new Date(stats.lastUpdated).toLocaleTimeString()}`}
          {developerStats && stats && ' | '}
          {developerStats && `Analytics updated: ${new Date(developerStats.updated_at).toLocaleTimeString()}`}
        </div>
      </div>
    </div>
  );
};

export default GitHubProjects;