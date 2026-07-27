'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import { CodeArenaNav } from '@/components/codeArena/CodeArenaNav';
import { IssueFormWizard } from '@/components/codeArena/IssueFormWizard';
import { MyWalletWidget } from '@/components/codeArena/MyWalletWidget';

export default function CreateIssuePage() {
  const { user, backendUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    }
  }, [user, backendUser, authLoading, router]);

  const fetchWallet = async () => {
    try {
      const res = await apiRequest('/api/code-arena/wallet/me');
      setWalletBalance(res.data?.balance || 0);
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    }
  };

  useEffect(() => {
    if (user && backendUser) {
      fetchWallet();
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
      <CodeArenaNav walletBalance={walletBalance} />

      <IssueFormWizard
        userWalletBalance={walletBalance}
        onDepositNeeded={() => setShowWalletModal(true)}
      />

      {showWalletModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <MyWalletWidget
              balance={walletBalance}
              onDepositSuccess={() => {
                fetchWallet();
                setShowWalletModal(false);
              }}
            />
            <button
              onClick={() => setShowWalletModal(false)}
              className="mt-3 w-full py-2 text-center text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
