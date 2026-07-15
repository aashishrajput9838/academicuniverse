import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { SkeletonLoader } from './SkeletonLoader';

/**
 * GrowthHeader – displays the user's name and organization.
 * Shows a loading skeleton while auth data is being fetched.
 */
export const GrowthHeader: React.FC = () => {
  const { backendUser, loading, logout } = useAuth();

  if (loading) {
    return <SkeletonLoader rows={1} className="w-48" />;
  }

  if (!backendUser) {
    return (
      <div className="text-sm text-gray-500">
        Not logged in. Please sign in.
      </div>
    );
  }

  return (
    <header className="flex items-center justify-between bg-white p-4 shadow-sm rounded-lg">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Welcome, {backendUser.name}
        </h1>
        <p className="text-sm text-gray-600">Organization: {backendUser.organization}</p>
      </div>
      <button
        onClick={logout}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
      >
        Sign Out
      </button>
    </header>
  );
};
