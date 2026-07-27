'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import { CodeArenaNav } from '@/components/codeArena/CodeArenaNav';
import { IssueFormWizard } from '@/components/codeArena/IssueFormWizard';

export default function CreateIssuePage() {
  const { user, backendUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [arenaPoints, setArenaPoints] = useState(1000);

  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    }
  }, [user, backendUser, authLoading, router]);

  const fetchPoints = async () => {
    try {
      const res = await apiRequest('/api/code-arena/points/me');
      setArenaPoints(res.data?.profile?.arenaPoints ?? 1000);
    } catch (err) {
      console.error('Failed to fetch AP balance:', err);
    }
  };

  useEffect(() => {
    if (user && backendUser) {
      fetchPoints();
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
    <div className="space-y-6 pb-12">
      <CodeArenaNav arenaPoints={arenaPoints} />
      <IssueFormWizard userArenaPoints={arenaPoints} />
    </div>
  );
}
