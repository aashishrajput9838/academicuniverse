'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import { CodeArenaNav } from '@/components/codeArena/CodeArenaNav';
import { ArenaPointsCard } from '@/components/codeArena/ArenaPointsCard';
import { TransactionRow } from '@/components/codeArena/TransactionRow';
import { History, ShieldCheck, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export default function ArenaPointsLedgerPage() {
  const { user, backendUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [pointsProfile, setPointsProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalTx, setTotalTx] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    }
  }, [user, backendUser, authLoading, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [profileRes, txRes] = await Promise.all([
        apiRequest('/api/code-arena/points/me'),
        apiRequest(`/api/code-arena/points/transactions?page=${page}&limit=15`),
      ]);

      setPointsProfile(profileRes.data?.profile);
      setTransactions(txRes.data?.transactions || []);
      setTotalTx(txRes.data?.total || 0);
      setTotalPages(txRes.data?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load AP ledger data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && backendUser) {
      fetchData();
    }
  }, [user, backendUser, page]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <CodeArenaNav arenaPoints={pointsProfile?.arenaPoints || 1000} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-amber-400" /> Arena Points Ledger
        </h1>
        <p className="text-xs text-slate-400">
          Review your Arena Points balance, daily check-in rewards, and immutable point transaction audit logs
        </p>
      </div>

      {/* Policy Notice Box */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-3 shadow-lg">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block mb-0.5">Arena Points (AP) Community Economy</span>
          Code Arena operates on Arena Points (AP). Every newly registered student receives <strong>1000 AP</strong> on account creation. AP is earned through daily check-ins (+5 AP), 7-day login streaks (+25 AP), and by providing accepted solutions to peer developer issues.
        </div>
      </div>

      {/* Points Card */}
      <ArenaPointsCard
        arenaPoints={pointsProfile?.arenaPoints}
        totalEarned={pointsProfile?.totalEarned}
        totalSpent={pointsProfile?.totalSpent}
        loginStreak={pointsProfile?.loginStreak}
        onClaimSuccess={fetchData}
      />

      {/* Ledger Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">AP Ledger Audit Trail ({totalTx})</h3>
          {isLoading && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading transactions...
            </span>
          )}
        </div>

        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Transaction Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Balance Snapshot</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <TransactionRow key={tx._id} tx={tx} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-500 text-xs">
            No AP transactions logged yet. Post an issue or claim your daily reward to get started!
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-800">
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
    </div>
  );
}
