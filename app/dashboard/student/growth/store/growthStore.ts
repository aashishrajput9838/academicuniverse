import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { fetchGrowthData } from '../growthApi';
import { GrowthResponse } from '../types/growth';

interface GrowthState {
  growthData: GrowthResponse | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
  refresh: (backendToken: string) => Promise<void>;
  reset: (errorMessage?: string) => void;
}

let inFlightToken: string | null = null;
let inFlightRequest: Promise<GrowthResponse> | null = null;

export const useGrowthStore = create<GrowthState>()(
  immer((set) => ({
    growthData: null,
    loading: false,
    error: null,
    lastFetchedAt: null,
    refresh: async (backendToken: string) => {
      if (!backendToken) {
        set((state) => {
          state.growthData = null;
          state.loading = false;
          state.error = 'Your session is no longer authenticated. Please sign in again to view your growth summary.';
          state.lastFetchedAt = null;
        });
        return;
      }

      if (!inFlightRequest || inFlightToken !== backendToken) {
        inFlightToken = backendToken;
        inFlightRequest = fetchGrowthData(backendToken).finally(() => {
          inFlightToken = null;
          inFlightRequest = null;
        });
      }

      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const growthData = await inFlightRequest;
        set((state) => {
          state.growthData = growthData;
          state.loading = false;
          state.error = null;
          state.lastFetchedAt = new Date();
        });
      } catch {
        set((state) => {
          state.loading = false;
          state.error = 'Growth summary unavailable right now. Please try again.';
        });
      }
    },
    reset: (errorMessage?: string) => {
      set((state) => {
        state.growthData = null;
        state.loading = false;
        state.error = errorMessage ?? null;
        state.lastFetchedAt = null;
      });
    },
  }))
);
