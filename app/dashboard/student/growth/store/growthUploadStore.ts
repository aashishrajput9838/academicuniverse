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
  fetchStatusDetail: (token: string, processingId: string) => Promise<void>;
  /** Force-refresh a single item's full state (including reviewStatus from KnowledgeRecord). Used after approve/reject. */
  refreshItem: (token: string, processingId: string) => Promise<void>;
  /** Remove a soft-deleted item immediately from all Growth Hub sections. */
  removeUpload: (processingId: string) => void;
  /** Bulk-remove soft-deleted items immediately from Growth Hub sections. */
  bulkRemoveUploads: (processingIds: string[]) => void;
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

        // Clean up polling for any processingIds that are no longer in history
        const activeHistoryPids = new Set(history.items.map((i) => i.processingId));
        Object.keys(get()._pollingIntervals).forEach((pid) => {
          if (!activeHistoryPids.has(pid)) {
            get().stopPolling(pid);
          }
        });

        // Start polling for non-terminal items
        history.items.forEach((item) => {
          if (!TERMINAL_STATUSES.has(item.status)) {
            get().startPolling(token, item.processingId);
          }
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
      // If the processingId was removed from uploads list, stop polling immediately
      const exists = get().uploads.some((u) => u.processingId === processingId);
      if (!exists && get()._pollingIntervals[processingId]) {
        get().stopPolling(processingId);
        return;
      }

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
            // Sync category+confidence from classification if available
            if (status.classification) {
              state.uploads[index].documentCategory = status.classification.documentCategory;
              state.uploads[index].confidenceScore = status.classification.confidenceScore;
            }
          }
        });

        // Stop polling once terminal status is reached
        if (TERMINAL_STATUSES.has(status.status)) {
          get().stopPolling(processingId);
        }
      } catch (err: any) {
        // ALWAYS stop polling if item returned 404 (deleted/not found) or 401/403 (unauthorized)
        if (
          err?.status === 404 ||
          err?.status === 401 ||
          err?.status === 403 ||
          String(err?.message).includes('404') ||
          String(err?.message).includes('401')
        ) {
          get().stopPolling(processingId);
          set((state) => {
            state.uploads = state.uploads.filter((u) => u.processingId !== processingId);
            delete state.processingStatuses[processingId];
          });
        }
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

    fetchStatusDetail: async (token: string, processingId: string) => {
      const currentStatus = get().processingStatuses[processingId];
      if (
        currentStatus &&
        TERMINAL_STATUSES.has(currentStatus.status) &&
        (currentStatus.reviewStatus === 'APPROVED' || currentStatus.reviewStatus === 'REJECTED')
      ) {
        return;
      }

      try {
        const status = await fetchProcessingStatus(token, processingId);
        set((state) => {
          state.processingStatuses[processingId] = status;

          const index = state.uploads.findIndex((u) => u.processingId === processingId);
          if (index !== -1) {
            state.uploads[index].status = status.status as GrowthUploadStatus;
            state.uploads[index].reviewStatus = status.reviewStatus;
            state.uploads[index].completedAt = status.completedAt;
            if (status.classification) {
              state.uploads[index].documentCategory = status.classification.documentCategory;
              state.uploads[index].confidenceScore = status.classification.confidenceScore;
            }
          }
        });
      } catch {
        // Suppress on-demand fetch errors
      }
    },

    refreshItem: async (token: string, processingId: string) => {
      try {
        const status = await fetchProcessingStatus(token, processingId);
        set((state) => {
          state.processingStatuses[processingId] = status;

          const index = state.uploads.findIndex((u) => u.processingId === processingId);
          if (index !== -1) {
            state.uploads[index].status = status.status as GrowthUploadStatus;
            state.uploads[index].reviewStatus = status.reviewStatus;
            state.uploads[index].completedAt = status.completedAt;
            if (status.classification) {
              state.uploads[index].documentCategory = status.classification.documentCategory;
              state.uploads[index].confidenceScore = status.classification.confidenceScore;
            }
          }
        });
      } catch {
        // Suppress errors
      }
    },

    removeUpload: (processingId: string) => {
      get().stopPolling(processingId);
      set((state) => {
        state.uploads = state.uploads.filter((upload) => upload.processingId !== processingId);
        delete state.processingStatuses[processingId];
      });
    },

    bulkRemoveUploads: (processingIds: string[]) => {
      const pidSet = new Set(processingIds);
      processingIds.forEach((pid) => get().stopPolling(pid));
      set((state) => {
        state.uploads = state.uploads.filter((upload) => !pidSet.has(upload.processingId));
        processingIds.forEach((pid) => {
          delete state.processingStatuses[pid];
        });
      });
    },
  }))
);
