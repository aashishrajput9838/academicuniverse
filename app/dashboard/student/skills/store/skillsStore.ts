import { create } from 'zustand';
import { fetchSkillProfile, fetchSkillEvidence, fetchSkillSummary } from '../skillsApi';
import {
  SkillProfileResponse,
  SkillDetailDTO,
  SkillSummaryResponse,
  SkillRecordDTO,
} from '../types/skills';

interface SkillsState {
  profile: SkillProfileResponse | null;
  summary: SkillSummaryResponse | null;
  selectedSkill: SkillRecordDTO | null;
  selectedSkillDetail: SkillDetailDTO | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
  setSelectedSkill: (skill: SkillRecordDTO | null) => void;
  refresh: (backendToken: string) => Promise<void>;
  loadDetail: (backendToken: string, skillId: string) => Promise<void>;
  reset: () => void;
}

let ongoingRefresh: Promise<void> | null = null;

export const useSkillsStore = create<SkillsState>((set, get) => ({
  profile: null,
  summary: null,
  selectedSkill: null,
  selectedSkillDetail: null,
  loading: false,
  detailLoading: false,
  error: null,
  lastFetchedAt: null,

  setSelectedSkill: (skill) => {
    set({ selectedSkill: skill, selectedSkillDetail: null });
  },

  refresh: async (backendToken) => {
    if (!backendToken) {
      set({
        profile: null,
        summary: null,
        loading: false,
        error: 'Session expired. Please sign in again.',
      });
      return;
    }

    if (ongoingRefresh) {
      return ongoingRefresh;
    }

    const promise = (async () => {
      set({ loading: true, error: null });

      try {
        const [profile, summary] = await Promise.all([
          fetchSkillProfile(backendToken),
          fetchSkillSummary(backendToken),
        ]);

        set({
          profile,
          summary,
          loading: false,
          error: null,
          lastFetchedAt: new Date(),
        });
      } catch (err: any) {
        set({
          loading: false,
          error: err.message || 'Failed to load skills data',
        });
      }
    })();

    ongoingRefresh = promise.finally(() => {
      ongoingRefresh = null;
    });

    return ongoingRefresh;
  },

  loadDetail: async (backendToken, skillId) => {
    if (!backendToken) return;

    set({ detailLoading: true, error: null });

    try {
      const detail = await fetchSkillEvidence(backendToken, skillId);
      set({ selectedSkillDetail: detail, detailLoading: false });
    } catch (err: any) {
      set({
        detailLoading: false,
        error: err.message || 'Failed to load skill details',
      });
    }
  },

  reset: () => {
    set({
      profile: null,
      summary: null,
      selectedSkill: null,
      selectedSkillDetail: null,
      loading: false,
      detailLoading: false,
      error: null,
      lastFetchedAt: null,
    });
  },
}));
