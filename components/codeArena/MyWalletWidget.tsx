'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Wallet, Lock, PlusCircle, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface MyWalletWidgetProps {
  balance?: number;
  lockedBalance?: number;
  totalEarned?: number;
  totalSpent?: number;
  onDepositSuccess?: () => void;
}

export const MyWalletWidget: React.FC<MyWalletWidgetProps> = ({
  balance = 0,
  lockedBalance = 0,
  totalEarned = 0,
  totalSpent = 0,
  onDepositSuccess,
}) => {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(depositAmount);
    if (!amountNum || amountNum <= 0) {
      setDepositError('Please enter a valid deposit amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setDepositError(null);
      await apiRequest('/api/code-arena/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: amountNum, description: 'Direct Credit Deposit' }),
      });
      setShowDepositModal(false);
      setDepositAmount('100');
      onDepositSuccess?.();
    } catch (err: any) {
      setDepositError(err.message || 'Deposit failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950/40 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">My Code Arena Wallet</h3>
            <p className="text-[11px] text-slate-400">Escrow & reward balance</p>
          </div>
        </div>

        <button
          onClick={() => setShowDepositModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Deposit Funds
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block mb-1">Available Balance</span>
          <span className="text-lg font-bold text-emerald-400">{balance.toLocaleString()} CR</span>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mb-1">
            <Lock className="w-3 h-3 text-amber-400" /> Locked Escrow
          </span>
          <span className="text-lg font-bold text-amber-400">{lockedBalance.toLocaleString()} CR</span>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block mb-1">Lifetime Earned</span>
          <span className="text-lg font-bold text-cyan-400">+{totalEarned.toLocaleString()} CR</span>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block mb-1">Total Reward Spent</span>
          <span className="text-lg font-bold text-slate-300">{totalSpent.toLocaleString()} CR</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
        <span className="text-[11px] text-slate-500 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
          Escrow guarantees reward delivery upon solution acceptance
        </span>

        <Link
          href="/dashboard/student/code/wallet"
          className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
        >
          Transaction History
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-white">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" /> Deposit Wallet Credits
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Academic Universe does not auto-generate free credits. Deposits represent real funds added by you to post rewards for technical issues.
            </p>

            {depositError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {depositError}
              </div>
            )}

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Deposit Amount (CR)</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[50, 100, 250, 500].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setDepositAmount(preset.toString())}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                        depositAmount === preset.toString()
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      +{preset} CR
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Enter custom amount"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Deposit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
