'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number;
}

interface SidebarProps {
  items: SidebarItem[];
}

export default function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 h-fit">
      <h2 className="text-xl font-bold text-white mb-6">Dashboard Menu</h2>
      <nav>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block px-4 py-3 rounded-lg transition ${pathname === item.href
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
              >
                <span className="flex items-center gap-3 w-full">
                  {item.icon && <span>{item.icon}</span>}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}