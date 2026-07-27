'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Compass, PlusCircle, History, Trophy, Sparkles } from 'lucide-react';

interface CodeArenaNavProps {
  arenaPoints?: number;
}

export const CodeArenaNav: React.FC<CodeArenaNavProps> = ({ arenaPoints }) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard/student/code', icon: LayoutDashboard },
    { label: 'Browse Issues', href: '/dashboard/student/code/issues', icon: Compass },
    { label: 'Post an Issue', href: '/dashboard/student/code/issues/new', icon: PlusCircle, primary: true },
    { label: 'AP Ledger', href: '/dashboard/student/code/ledger', icon: History, badge: arenaPoints !== undefined ? `${arenaPoints} AP` : undefined },
    { label: 'Leaderboard', href: '/dashboard/student/code/leaderboard', icon: Trophy },
  ];

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 mb-8 shadow-xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-amber-500/20 font-bold text-slate-950 text-base">
            ⚡
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Code Arena
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Points Economy
              </span>
            </h1>
            <p className="text-xs text-slate-400">Peer-to-peer developer community & AP rewards</p>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
