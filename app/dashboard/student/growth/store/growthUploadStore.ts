import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  uploadDocument,
  fetchUploadHistory,
  fetchProcessingStatus,
} from '../growthApi';
import type {
  GrowthUploadHistoryItem,
  GrowthProcessingStatus,
  GrowthUploadStatus,
} from '../types/growthUpload';
import { TERMINAL_STATUSES } from '../types/growthUpload';

const POLL_INTERVAL_MS = 3_000;

interface GrowthUploadState {
  /** Upload history items */
  uploads: GrowthUploadHistoryItem[];
  /** Whether history is currently loading */
  historyLoading: boolean;
  /** Whether a file upload is in-progress */
  uploading: boolean;
  /** Last upload error message */
  uploadError: string | null;
  /** Cached processing status per processingId */
  processingStatuses: Record<string, GrowthProcessingStatus>;
  /** Active polling interval IDs */
  _pollingIntervals: Record<string, ReturnType<typeof setInterval>>;

  // ── Actions ──
  loadHistory: (token: string) => Promise<void>;
  uploadFile: (token: string, file: File) => Promise<string | null>;
  pollStatus: (token: string, processingId: string) => Promise<void>;
  startPolling: (token: string, processingId: string) => void;
  stopPolling: (processingId: string) => void;
  stopAllPolling: () => void;
}

export const useGrowthUploadStore = create<GrowthUploadState>()(
  immer((set, get) => ({
    uploads: [],
    historyLoading: false,
    uploading: false,
    uploadError: null,
    processingStatuses: {},
    _pollingIntervals: {},

    loadHistory: async (token: string) => {
      set((state) => {
        state.historyLoading = true;
      });

      try {
        const history = await fetchUploadHistory(token, 20);
        set((state) => {
          state.uploads = history.items;
          state.historyLoading = false;
        });
      } catch {
        set((state) => {
          state.historyLoading = false;
        });
      }
    },

    uploadFile: async (token: string, file: File) => {
      set((state) => {
        state.uploading = true;
        state.uploadError = null;
      });

      try {
        const result = await uploadDocument(token, file);
        // Reload history to include the new upload
        const history = await fetchUploadHistory(token, 20);
        set((state) => {
          state.uploading = false;
          state.uploads = history.items;
        });

        // Start polling for the new upload
        get().startPolling(token, result.processingId);
        return result.processingId;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        set((state) => {
          state.uploading = false;
          state.uploadError = message;
        });
        return null;
      }
    },

    pollStatus: async (token: string, processingId: string) => {
      try {
        const status = await fetchProcessingStatus(token, processingId);
        set((state) => {
          state.processingStatuses[processingId] = status;

          // Update the matching upload item in the history list
          const index = state.uploads.findIndex((u) => u.processingId === processingId);
          if (index !== -1) {
            state.uploads[index].status = status.status as GrowthUploadStatus;
            state.uploads[index].reviewStatus = status.reviewStatus;
            state.uploads[index].completedAt = status.completedAt;
          }
        });

        // Stop polling once terminal status is reached
        if (TERMINAL_STATUSES.has(status.status)) {
          get().stopPolling(processingId);
        }
      } catch {
        // Swallow polling errors — retry on next interval
      }
    },

    startPolling: (token: string, processingId: string) => {
      const current = get()._pollingIntervals;
      if (current[processingId]) {
        return; // Already polling
      }

      // Fetch immediately, then set interval
      get().pollStatus(token, processingId);

      const intervalId = setInterval(() => {
        get().pollStatus(token, processingId);
      }, POLL_INTERVAL_MS);

      set((state) => {
        state._pollingIntervals[processingId] = intervalId;
      });
    },

    stopPolling: (processingId: string) => {
      const intervals = get()._pollingIntervals;
      const intervalId = intervals[processingId];
      if (intervalId) {
        clearInterval(intervalId);
        set((state) => {
          delete state._pollingIntervals[processingId];
        });
      }
    },

    stopAllPolling: () => {
      const intervals = get()._pollingIntervals;
      for (const processingId of Object.keys(intervals)) {
        clearInterval(intervals[processingId]);
      }
      set((state) => {
        state._pollingIntervals = {};
      });
    },
  }))
);
