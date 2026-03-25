import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GrowSpace } from '../lib/types';
import { spaceService } from '../lib/services/spaceService';
import { noteService } from '../lib/services/noteService';
import { useAuthStore } from './authStore';

interface SpaceState {
  spaces: GrowSpace[];
  selectedSpace: GrowSpace | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadSpaces: () => Promise<void>;
  createSpace: (spaceData: Omit<GrowSpace, 'id' | 'createdAt' | 'updatedAt' | 'plantCount'>) => Promise<GrowSpace>;
  updateSpace: (id: string, updates: Partial<GrowSpace>) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  selectSpace: (space: GrowSpace | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const SPACE_TYPE_LABELS: Record<GrowSpace['type'], string> = {
  'indoor-tent': 'Indoor Tent',
  'outdoor-bed': 'Outdoor Bed',
  greenhouse: 'Greenhouse',
  hydroponic: 'Hydroponic',
  container: 'Container',
};

export const useSpaceStore = create<SpaceState>()(
  subscribeWithSelector((set, get) => ({
    spaces: [],
    selectedSpace: null,
    loading: false,
    error: null,

    loadSpaces: async () => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      set({ loading: true, error: null });
      try {
        const result = await spaceService.getUserSpaces(user.uid);
        if (result.error) {
          set({ 
            error: result.error.message,
            loading: false 
          });
        } else {
          set({ spaces: result.data || [], loading: false });
        }
      } catch (error) {
        console.error('Failed to load spaces:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load spaces',
          loading: false 
        });
      }
    },

    createSpace: async (spaceData) => {
      set({ loading: true, error: null });
      try {
        const result = await spaceService.createSpace(spaceData);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        } else {
          const newSpace = result.data!;
          set(state => ({ 
            spaces: [...state.spaces, newSpace],
            loading: false 
          }));

          const currentUserId = useAuthStore.getState().user?.uid ?? spaceData.userId;

          try {
            if (currentUserId) {
              await noteService.create(
                {
                  content: `Space created: ${newSpace.name} (${SPACE_TYPE_LABELS[newSpace.type]})`,
                  category: 'milestone',
                  spaceId: newSpace.id,
                },
                currentUserId
              );
            }
          } catch (noteError) {
            console.warn('Failed to log space creation note:', {
              spaceId: newSpace.id,
              error: noteError,
            });
          }

          return newSpace;
        }
      } catch (error) {
        console.error('Failed to create space:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create space';
        set({ error: errorMessage, loading: false });
        throw error;
      }
    },

    updateSpace: async (id, updates) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        throw new Error('User not authenticated');
      }

      set({ loading: true, error: null });
      try {
        const result = await spaceService.updateSpace(id, updates, user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        } else {
          const updatedSpace = result.data!;
          set(state => ({
            spaces: state.spaces.map(space => 
              space.id === id ? updatedSpace : space
            ),
            selectedSpace: state.selectedSpace?.id === id ? updatedSpace : state.selectedSpace,
            loading: false
          }));
        }
      } catch (error) {
        console.error('Failed to update space:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update space',
          loading: false 
        });
        throw error;
      }
    },

    deleteSpace: async (id) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        throw new Error('User not authenticated');
      }

      set({ loading: true, error: null });
      try {
        const result = await spaceService.deleteSpace(id, user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        } else {
          set(state => ({
            spaces: state.spaces.filter(space => space.id !== id),
            selectedSpace: state.selectedSpace?.id === id ? null : state.selectedSpace,
            loading: false
          }));
        }
      } catch (error) {
        console.error('Failed to delete space:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete space',
          loading: false 
        });
        throw error;
      }
    },

    selectSpace: (space) => {
      set({ selectedSpace: space });
    },

    setError: (error) => {
      set({ error });
    },

    clearError: () => {
      set({ error: null });
    }
  }))
);
