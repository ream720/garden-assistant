import { where, orderBy } from 'firebase/firestore';
import { BaseService, type ServiceResult, type QueryFilters } from './baseService';
import { spaceService } from './spaceService';
import type { Plant, PlantStatus } from '../types';

export interface CreatePlantData {
  spaceId: string;
  userId: string;
  name: string;
  variety?: string;
  seedSource?: string;
  plantedDate: Date;
  expectedHarvestDate?: Date;
  status?: PlantStatus;
  notes?: string;
}

export interface UpdatePlantData {
  name?: string;
  variety?: string;
  seedSource?: string;
  plantedDate?: Date;
  expectedHarvestDate?: Date;
  actualHarvestDate?: Date;
  status?: PlantStatus;
  notes?: string;
}

export interface MovePlantData {
  newSpaceId: string;
  notes?: string;
}

export class PlantService extends BaseService<Plant> {
  constructor() {
    super('plants');
  }

  /**
   * Create a new plant
   */
  async createPlant(data: CreatePlantData): Promise<ServiceResult<Plant>> {
    // Validate required fields
    if (!data.name?.trim()) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plant name is required',
        },
      };
    }

    if (!data.userId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      };
    }

    if (!data.spaceId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Space ID is required',
        },
      };
    }

    if (!data.plantedDate) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Planted date is required',
        },
      };
    }

    // Validate that the space exists and belongs to the user
    const spaceResult = await spaceService.getById(data.spaceId);
    if (spaceResult.error) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid space ID',
        },
      };
    }

    const space = spaceResult.data!;
    if (space.userId !== data.userId) {
      return {
        error: {
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to add plants to this space',
        },
      };
    }

    const plantData = {
      ...data,
      name: data.name.trim(),
      variety: data.variety?.trim() || '',
      seedSource: data.seedSource?.trim(),
      status: data.status || ('seedling' as PlantStatus), // Use provided status or default to seedling
      notes: data.notes?.trim(),
    };

    // Create the plant
    const plantResult = await this.create(plantData);

    if (plantResult.data) {
      // Update the space's plant count
      await spaceService.updatePlantCount(data.spaceId, space.plantCount + 1);
    }

    return plantResult;
  }

  /**
   * Get all plants for a specific space
   */
  async getSpacePlants(spaceId: string, userId: string): Promise<ServiceResult<Plant[]>> {
    if (!spaceId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Space ID is required',
        },
      };
    }

    if (!userId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      };
    }

    // First get all user plants, then filter by space in memory
    // This avoids the need for a composite index
    const userPlantsResult = await this.getUserPlants(userId);

    if (userPlantsResult.error) {
      return userPlantsResult;
    }

    const spacePlants = (userPlantsResult.data || []).filter(plant => plant.spaceId === spaceId);

    return { data: spacePlants };
  }

  /**
   * Get all plants for a user
   */
  async getUserPlants(userId: string): Promise<ServiceResult<Plant[]>> {
    if (!userId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      };
    }

    // Simplified query without orderBy to avoid index requirements
    const filters: QueryFilters = {
      where: [{ field: 'userId', operator: '==', value: userId }],
    };

    const result = await this.list(filters);

    // Sort in memory instead of in the query
    if (result.data) {
      result.data.sort((a, b) => {
        const dateA = a.plantedDate instanceof Date ? a.plantedDate : new Date(a.plantedDate);
        const dateB = b.plantedDate instanceof Date ? b.plantedDate : new Date(b.plantedDate);
        return dateB.getTime() - dateA.getTime(); // Descending order
      });
    }

    return result;
  }

  /**
   * Get plants by status for a user
   */
  async getPlantsByStatus(userId: string, status: PlantStatus): Promise<ServiceResult<Plant[]>> {
    if (!userId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      };
    }

    if (!status) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status is required',
        },
      };
    }

    const validStatuses: PlantStatus[] = ['seedling', 'vegetative', 'flowering', 'harvested', 'removed'];
    if (!validStatuses.includes(status)) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid plant status',
        },
      };
    }

    const filters: QueryFilters = {
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'status', operator: '==', value: status },
      ],
      orderBy: [{ field: 'plantedDate', direction: 'desc' }],
    };

    return this.list(filters);
  }

  /**
   * Update a plant
   */
  async updatePlant(id: string, updates: UpdatePlantData): Promise<ServiceResult<Plant>> {
    if (!id) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plant ID is required',
        },
      };
    }

    // Validate name if provided
    if (updates.name !== undefined && !updates.name?.trim()) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plant name cannot be empty',
        },
      };
    }

    // Validate status if provided
    if (updates.status) {
      const validStatuses: PlantStatus[] = ['seedling', 'vegetative', 'flowering', 'harvested', 'removed'];
      if (!validStatuses.includes(updates.status)) {
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid plant status',
          },
        };
      }
    }

    // Clean up string fields
    const cleanUpdates = {
      ...updates,
      ...(updates.name && { name: updates.name.trim() }),
      ...(updates.variety !== undefined && { variety: updates.variety.trim() }),
      ...(updates.seedSource !== undefined && { seedSource: updates.seedSource?.trim() }),
      ...(updates.notes !== undefined && { notes: updates.notes?.trim() }),
    };

    return this.update(id, cleanUpdates);
  }

  /**
   * Move a plant to a different space
   */
  async movePlant(plantId: string, moveData: MovePlantData): Promise<ServiceResult<Plant>> {
    if (!plantId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plant ID is required',
        },
      };
    }

    if (!moveData.newSpaceId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New space ID is required',
        },
      };
    }

    // Get the current plant
    const plantResult = await this.getById(plantId);
    if (plantResult.error) {
      return { error: plantResult.error };
    }

    const plant = plantResult.data!;
    const oldSpaceId = plant.spaceId;

    // Validate that the new space exists and belongs to the same user
    const newSpaceResult = await spaceService.getById(moveData.newSpaceId);
    if (newSpaceResult.error) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid new space ID',
        },
      };
    }

    const newSpace = newSpaceResult.data!;
    if (newSpace.userId !== plant.userId) {
      return {
        error: {
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to move plants to this space',
        },
      };
    }

    // Don't move if it's the same space
    if (oldSpaceId === moveData.newSpaceId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plant is already in the specified space',
        },
      };
    }

    // Update the plant's space
    const updateData: UpdatePlantData = {
      ...(moveData.notes && { notes: moveData.notes.trim() }),
    };

    const updateResult = await this.update(plantId, {
      ...updateData,
      spaceId: moveData.newSpaceId,
    });

    if (updateResult.data) {
      // Update plant counts for both spaces
      const oldSpaceResult = await spaceService.getById(oldSpaceId);
      if (oldSpaceResult.data) {
        await spaceService.updatePlantCount(oldSpaceId, oldSpaceResult.data.plantCount - 1);
      }
      await spaceService.updatePlantCount(moveData.newSpaceId, newSpace.plantCount + 1);
    }

    return updateResult;
  }

  /**
   * Mark a plant as harvested
   */
  async harvestPlant(plantId: string, harvestDate: Date, notes?: string): Promise<ServiceResult<Plant>> {
    if (!plantId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plant ID is required',
        },
      };
    }

    if (!harvestDate) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Harvest date is required',
        },
      };
    }

    const updateData: UpdatePlantData = {
      status: 'harvested',
      actualHarvestDate: harvestDate,
      ...(notes && { notes: notes.trim() }),
    };

    return this.update(plantId, updateData);
  }

  /**
   * Remove a plant (mark as removed and update space plant count)
   */
  async removePlant(plantId: string, notes?: string): Promise<ServiceResult<Plant>> {
    if (!plantId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plant ID is required',
        },
      };
    }

    // Get the current plant to update space count
    const plantResult = await this.getById(plantId);
    if (plantResult.error) {
      return { error: plantResult.error };
    }

    const plant = plantResult.data!;

    const updateData: UpdatePlantData = {
      status: 'removed',
      ...(notes && { notes: notes.trim() }),
    };

    const updateResult = await this.update(plantId, updateData);

    if (updateResult.data && plant.status !== 'removed') {
      // Update the space's plant count (only if plant wasn't already removed)
      const spaceResult = await spaceService.getById(plant.spaceId);
      if (spaceResult.data) {
        await spaceService.updatePlantCount(plant.spaceId, spaceResult.data.plantCount - 1);
      }
    }

    return updateResult;
  }

  /**
   * Subscribe to real-time updates for space plants
   */
  subscribeToSpacePlants(
    spaceId: string,
    userId: string,
    callback: (result: ServiceResult<Plant[]>) => void
  ): () => void {
    if (!spaceId || !userId) {
      callback({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Space ID and User ID are required',
        },
      });
      return () => {};
    }

    const filters: QueryFilters = {
      where: [
        { field: 'spaceId', operator: '==', value: spaceId },
        { field: 'userId', operator: '==', value: userId },
      ],
      orderBy: [{ field: 'plantedDate', direction: 'desc' }],
    };

    return this.subscribe(callback, filters);
  }

  /**
   * Subscribe to real-time updates for user plants
   */
  subscribeToUserPlants(
    userId: string,
    callback: (result: ServiceResult<Plant[]>) => void
  ): () => void {
    if (!userId) {
      callback({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      });
      return () => {};
    }

    const filters: QueryFilters = {
      where: [{ field: 'userId', operator: '==', value: userId }],
      orderBy: [{ field: 'plantedDate', direction: 'desc' }],
    };

    return this.subscribe(callback, filters);
  }

  /**
   * Alias for getSpacePlants to match store expectations
   */
  async getPlantsBySpace(spaceId: string): Promise<ServiceResult<Plant[]>> {
    // We need the user ID, so we'll get it from the auth store
    // This is a temporary solution - ideally the store should pass the userId
    const { user } = await import('../../stores/authStore').then(m => m.useAuthStore.getState());

    if (!user) {
      return {
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'User not authenticated',
        },
      };
    }

    return this.getSpacePlants(spaceId, user.uid);
  }

  /**
   * Delete a plant (alias for removePlant)
   */
  async deletePlant(plantId: string): Promise<ServiceResult<Plant>> {
    if (!plantId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plant ID is required',
        },
      };
    }

    // Get the current plant to update space count
    const plantResult = await this.getById(plantId);
    if (plantResult.error) {
      return { error: plantResult.error };
    }

    const plant = plantResult.data!;

    // Actually delete the plant from the database
    const deleteResult = await this.delete(plantId);

    if (deleteResult.error) {
      return { error: deleteResult.error };
    }

    // Update the space's plant count
    const spaceResult = await spaceService.getById(plant.spaceId);
    if (spaceResult.data) {
      await spaceService.updatePlantCount(plant.spaceId, spaceResult.data.plantCount - 1);
    }

    return { data: plant };
  }
}

// Export a singleton instance
export const plantService = new PlantService();
