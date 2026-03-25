import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Plant } from '../lib/types';
import { plantService } from '../lib/services/plantService';
import { noteService } from '../lib/services/noteService';
import { formatPlantDisplayName } from '../lib/utils/plantDisplay';
import { useAuthStore } from './authStore';

export interface HarvestPlantOptions {
  createLinkedNote?: boolean;
  noteContent?: string;
  noteTimestamp?: Date;
}

export interface HarvestPlantResult {
  noteCreated: boolean;
  noteError?: string;
}

interface PlantState {
  plants: Plant[];
  selectedPlant: Plant | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadPlants: (spaceId?: string) => Promise<void>;
  createPlant: (plantData: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Plant>;
  updatePlant: (id: string, updates: Partial<Plant>) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;
  movePlant: (id: string, newSpaceId: string) => Promise<void>;
  harvestPlant: (
    id: string,
    harvestDate: Date,
    options?: HarvestPlantOptions
  ) => Promise<HarvestPlantResult>;
  selectPlant: (plant: Plant | null) => void;
  getPlantsBySpace: (spaceId: string) => Plant[];
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const usePlantStore = create<PlantState>()(
  subscribeWithSelector((set, get) => ({
    plants: [],
    selectedPlant: null,
    loading: false,
    error: null,

    loadPlants: async (spaceId) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      set({ loading: true, error: null });
      try {
        const result = spaceId 
          ? await plantService.getSpacePlants(spaceId, user.uid)
          : await plantService.getUserPlants(user.uid);
          
        if (result.error) {
          // If it's a precondition failure, show a more helpful message
          if (result.error.code === 'FAILED_PRECONDITION') {
            set({ 
              error: 'Unable to load plants. This might be due to browser extensions blocking requests or Firestore configuration.',
              loading: false 
            });
          } else {
            set({ 
              error: result.error.message,
              loading: false 
            });
          }
        } else {
          set({ plants: result.data || [], loading: false });
        }
      } catch (error) {
        console.error('Failed to load plants:', error);
        // Fallback to empty array if there's any error
        set({ 
          plants: [],
          error: 'Unable to load plants. You can still add new plants.',
          loading: false 
        });
      }
    },

    createPlant: async (plantData) => {
      set({ loading: true, error: null });
      try {
        const result = await plantService.createPlant(plantData);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        } else {
          const newPlant = result.data!;
          set(state => ({ 
            plants: [...state.plants, newPlant],
            loading: false 
          }));

          const currentUserId = useAuthStore.getState().user?.uid ?? plantData.userId;

          try {
            if (currentUserId) {
              await noteService.create(
                {
                  content: `Plant created: ${formatPlantDisplayName(newPlant)}`,
                  category: 'milestone',
                  plantId: newPlant.id,
                  spaceId: newPlant.spaceId,
                },
                currentUserId
              );
            }
          } catch (noteError) {
            console.warn('Failed to log plant creation note:', {
              plantId: newPlant.id,
              error: noteError,
            });
          }

          return newPlant;
        }
      } catch (error) {
        console.error('Failed to create plant:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create plant';
        set({ error: errorMessage, loading: false });
        throw error;
      }
    },

    updatePlant: async (id, updates) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        throw new Error('User not authenticated');
      }

      set({ loading: true, error: null });
      try {
        const result = await plantService.updatePlant(id, updates, user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        } else {
          const updatedPlant = result.data!;
          set(state => ({
            plants: state.plants.map(plant => 
              plant.id === id ? updatedPlant : plant
            ),
            selectedPlant: state.selectedPlant?.id === id ? updatedPlant : state.selectedPlant,
            loading: false
          }));
        }
      } catch (error) {
        console.error('Failed to update plant:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update plant',
          loading: false 
        });
        throw error;
      }
    },

    deletePlant: async (id) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        throw new Error('User not authenticated');
      }

      set({ loading: true, error: null });
      try {
        const result = await plantService.deletePlant(id, user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        } else {
          set(state => ({
            plants: state.plants.filter(plant => plant.id !== id),
            selectedPlant: state.selectedPlant?.id === id ? null : state.selectedPlant,
            loading: false
          }));
        }
      } catch (error) {
        console.error('Failed to delete plant:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete plant',
          loading: false 
        });
        throw error;
      }
    },

    movePlant: async (id, newSpaceId) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        throw new Error('User not authenticated');
      }

      set({ loading: true, error: null });
      try {
        const result = await plantService.movePlant(id, { newSpaceId }, user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        } else {
          const updatedPlant = result.data!;
          set(state => ({
            plants: state.plants.map(plant => 
              plant.id === id ? updatedPlant : plant
            ),
            selectedPlant: state.selectedPlant?.id === id ? updatedPlant : state.selectedPlant,
            loading: false
          }));
        }
      } catch (error) {
        console.error('Failed to move plant:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to move plant',
          loading: false 
        });
        throw error;
      }
    },

    harvestPlant: async (id, harvestDate, options = {}) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        throw new Error('User not authenticated');
      }

      set({ loading: true, error: null });
      try {
        const result = await plantService.harvestPlant(id, harvestDate, user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        }

        const updatedPlant = result.data!;
        set(state => ({
          plants: state.plants.map(plant => 
            plant.id === id ? updatedPlant : plant
          ),
          selectedPlant: state.selectedPlant?.id === id ? updatedPlant : state.selectedPlant,
        }));

        if (!options.createLinkedNote) {
          set({ loading: false });
          return { noteCreated: false };
        }

        const trimmedContent = options.noteContent?.trim();
        const noteContent =
          trimmedContent && trimmedContent.length > 0
            ? trimmedContent
            : `Harvest recorded for ${updatedPlant.name}.`;

        try {
          await noteService.create(
            {
              content: noteContent,
              category: 'milestone',
              plantId: updatedPlant.id,
              spaceId: updatedPlant.spaceId,
              timestamp: options.noteTimestamp ?? harvestDate,
            },
            user.uid
          );

          set({ loading: false });
          return { noteCreated: true };
        } catch (noteError) {
          const noteErrorMessage =
            noteError instanceof Error
              ? noteError.message
              : 'Failed to create linked harvest note';

          console.warn('Harvest recorded but linked note creation failed:', {
            plantId: updatedPlant.id,
            error: noteError,
          });

          set({ loading: false });
          return {
            noteCreated: false,
            noteError: noteErrorMessage,
          };
        }
      } catch (error) {
        console.error('Failed to harvest plant:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to harvest plant',
          loading: false 
        });
        throw error;
      }
    },

    selectPlant: (plant) => {
      set({ selectedPlant: plant });
    },

    getPlantsBySpace: (spaceId) => {
      return get().plants.filter(plant => plant.spaceId === spaceId);
    },

    setError: (error) => {
      set({ error });
    },

    clearError: () => {
      set({ error: null });
    }
  }))
);
