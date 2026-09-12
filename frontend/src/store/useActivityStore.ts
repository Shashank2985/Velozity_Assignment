import { create } from 'zustand';
import { TaskActivityLogDto } from '../types/activity';
import { activityService } from '../services/activity.service';

interface ActivityState {
  activities: TaskActivityLogDto[];
  lastSeenTimestamp: string | null;
  isLoading: boolean;
  isFeedOpen: boolean;

  fetchActivities: (projectId?: string) => Promise<void>;
  handleSocketActivity: (activity: TaskActivityLogDto) => void;
  setActivities: (activities: TaskActivityLogDto[]) => void;
  performCatchUpSync: (projectId?: string) => Promise<void>;
  setFeedOpen: (open: boolean) => void;
  toggleFeed: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  lastSeenTimestamp: null,
  isLoading: false,
  isFeedOpen: false,

  setFeedOpen: (open: boolean) => set({ isFeedOpen: open }),
  toggleFeed: () => set((state) => ({ isFeedOpen: !state.isFeedOpen })),

  setActivities: (newActivities: TaskActivityLogDto[]) => {
    set((state) => {
      const combined = [...newActivities, ...state.activities];
      // Deduplicate by ID
      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
      // Sort newest first
      unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const latestTimestamp = unique.length > 0 ? unique[0].createdAt : state.lastSeenTimestamp;

      return {
        activities: unique.slice(0, 50),
        lastSeenTimestamp: latestTimestamp,
      };
    });
  },

  fetchActivities: async (projectId?: string) => {
    set({ isLoading: true });
    try {
      const res = await activityService.getActivityLogs({ projectId, limit: 30 });
      if (res.success && res.activities) {
        const latestTimestamp = res.activities.length > 0 ? res.activities[0].createdAt : null;
        set({
          activities: res.activities,
          lastSeenTimestamp: latestTimestamp,
          isLoading: false,
        });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },

  handleSocketActivity: (activity: TaskActivityLogDto) => {
    set((state) => {
      const exists = state.activities.some((a) => a.id === activity.id);
      if (exists) return state;

      const updated = [activity, ...state.activities].slice(0, 50);
      return {
        activities: updated,
        lastSeenTimestamp: activity.createdAt,
      };
    });
  },

  performCatchUpSync: async (projectId?: string) => {
    const lastSeen = get().lastSeenTimestamp;
    try {
      const res = await activityService.getActivityLogs({
        projectId,
        lastSeenTimestamp: lastSeen || undefined,
        limit: 50,
      });

      if (res.success && res.activities && res.activities.length > 0) {
        get().setActivities(res.activities);
      }
    } catch (err) {
      // Fallback
    }
  },
}));
