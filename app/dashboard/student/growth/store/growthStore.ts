// app/dashboard/student/growth/store/growthStore.ts

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { GrowthResponse } from '../types/growth';

/** Minimal GrowthStore placeholder – will be expanded later */
interface GrowthState {
  growthData: GrowthResponse | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
  refresh: (backendToken: string) => Promise<void>;
  reset: (errorMessage?: string) => void;
}

export const useGrowthStore = create<GrowthState>()(
  immer(set => ({
    growthData: null,
    loading: false,
    error: null,
    lastFetchedAt: null,
    refresh: async (_: string) => {
      // placeholder – no network request yet
      set(state => {
        state.loading = false;
        state.error = null;
      });
    },
    reset: (msg?: string) => {
      set(state => {
        state.growthData = null;
        state.loading = false;
        state.error = msg ?? null;
        state.lastFetchedAt = null;
      });
    },
  }))
);
