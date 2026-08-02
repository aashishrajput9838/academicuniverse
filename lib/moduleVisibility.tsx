'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface ModuleConfig {
  key: string;
  name: string;
  description?: string;
  category: string;
  isEnabled: boolean;
  isVisible: boolean;
  sortOrder: number;
}

interface ModuleVisibilityContextType {
  modules: Map<string, ModuleConfig>;
  loading: boolean;
  isModuleVisible: (key: string) => boolean;
  isModuleEnabled: (key: string) => boolean;
  refresh: () => Promise<void>;
}

const ModuleVisibilityContext = createContext<ModuleVisibilityContextType | null>(null);

export function useModuleVisibility(): ModuleVisibilityContextType {
  const context = useContext(ModuleVisibilityContext);
  if (!context) {
    return {
      modules: new Map(),
      loading: true,
      isModuleVisible: () => true,
      isModuleEnabled: () => true,
      refresh: async () => {},
    };
  }
  return context;
}

const REGISTERED_MODULES: Omit<ModuleConfig, 'isEnabled' | 'isVisible'>[] = [
  { key: 'dashboard', name: 'Dashboard', category: 'core', sortOrder: 0 },
  { key: 'profile', name: 'Profile', category: 'personal', sortOrder: 1 },
  { key: 'events', name: 'Events from Gmail', category: 'communication', sortOrder: 2 },
  { key: 'mail', name: 'Mail Explorer', category: 'communication', sortOrder: 3 },
  { key: 'growth-hub', name: 'Growth Hub', category: 'academic', sortOrder: 4 },
  { key: 'document-intelligence', name: 'Document Intelligence', category: 'productivity', sortOrder: 5 },
  { key: 'academic-schedule', name: 'Academic Schedule', category: 'academic', sortOrder: 6 },
  { key: 'career-profile', name: 'Career Profile', category: 'career', sortOrder: 7 },
  { key: 'ai-chatbot', name: 'AI Chatbot', category: 'ai', sortOrder: 8 },
  { key: 'research-wing', name: 'Research Wing', category: 'research', sortOrder: 9 },
  { key: 'code-arena', name: 'Code Arena', category: 'development', sortOrder: 10 },
  { key: 'academic-records', name: 'Academic Records', category: 'academic', sortOrder: 11 },
  { key: 'sync-college-profile', name: 'Sync College Profile', category: 'integration', sortOrder: 12 },
  { key: 'webscrap', name: 'Webscrap', category: 'productivity', sortOrder: 13 },
  { key: 'skills-tracker', name: 'Skills Tracker', category: 'career', sortOrder: 14 },
  { key: 'resume-builder', name: 'Resume Builder', category: 'career', sortOrder: 15 },
  { key: 'overlap-engine', name: 'Overlap Engine', category: 'academic', sortOrder: 16 },
  { key: 'find-faculty-cabin', name: 'Find Faculty Cabin', category: 'navigation', sortOrder: 17 },
  { key: 'soft-skills-lab', name: 'Soft Skills Lab', category: 'career', sortOrder: 18 },
  { key: 'career-verified-profile', name: 'Career & Verified Profile', category: 'career', sortOrder: 19 },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5003';

export function ModuleVisibilityProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<Map<string, ModuleConfig>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchVisibility = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('backendToken') : null;
      const response = await fetch(`${API_BASE_URL}/api/module-visibility`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        const serverModules = new Map<string, ModuleConfig>();
        
        for (const m of data.modules || []) {
          serverModules.set(m.key, m as ModuleConfig);
        }
        
        for (const registered of REGISTERED_MODULES) {
          const existing = serverModules.get(registered.key);
          serverModules.set(registered.key, {
            ...registered,
            isEnabled: existing?.isEnabled ?? true,
            isVisible: existing?.isVisible ?? true,
          });
        }
        
        setModules(serverModules);
      }
    } catch (error) {
      console.error('Failed to fetch module visibility:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisibility();
  }, [fetchVisibility]);

  const isModuleVisible = useCallback(
    (key: string) => {
      const mod = modules.get(key);
      return mod ? mod.isVisible : true;
    },
    [modules]
  );

  const isModuleEnabled = useCallback(
    (key: string) => {
      const mod = modules.get(key);
      return mod ? mod.isEnabled && mod.isVisible : true;
    },
    [modules]
  );

  return (
    <ModuleVisibilityContext.Provider
      value={{
        modules,
        loading,
        isModuleVisible,
        isModuleEnabled,
        refresh: fetchVisibility,
      }}
    >
      {children}
    </ModuleVisibilityContext.Provider>
  );
}

export function useIsModuleVisible(key: string): boolean {
  const { isModuleVisible, loading } = useModuleVisibility();
  return loading ? true : isModuleVisible(key);
}

export function useIsModuleEnabled(key: string): boolean {
  const { isModuleEnabled, loading } = useModuleVisibility();
  return loading ? true : isModuleEnabled(key);
}
