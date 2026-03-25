import { BaseService, type ServiceResult, type QueryFilters } from './baseService';
import type { GrowSpace, SpaceType } from '../types';

export interface CreateSpaceData {
  userId: string;
  name: string;
  type: SpaceType;
  description?: string;
  dimensions?: {
    length: number;
    width: number;
    height?: number;
    unit: 'cm' | 'inches' | 'feet';
  };
  environment?: {
    temperature?: {
      min: number;
      max: number;
      unit: 'celsius' | 'fahrenheit';
    };
    humidity?: {
      min: number;
      max: number;
    };
    lightSchedule?: {
      hoursOn: number;
      hoursOff: number;
    };
  };
}

export interface UpdateSpaceData {
  name?: string;
  type?: SpaceType;
  description?: string;
  dimensions?: {
    length: number;
    width: number;
    height?: number;
    unit: 'cm' | 'inches' | 'feet';
  };
  environment?: {
    temperature?: {
      min: number;
      max: number;
      unit: 'celsius' | 'fahrenheit';
    };
    humidity?: {
      min: number;
      max: number;
    };
    lightSchedule?: {
      hoursOn: number;
      hoursOff: number;
    };
  };
}

export class SpaceService extends BaseService<GrowSpace> {
  constructor() {
    super('spaces', { userScoped: true });
  }

  async getById(id: string, userId: string): Promise<ServiceResult<GrowSpace>> {
    return super.getById(id, userId);
  }

  /**
   * Create a new grow space
   */
  async createSpace(data: CreateSpaceData): Promise<ServiceResult<GrowSpace>> {
    // Validate required fields
    if (!data.name?.trim()) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Space name is required',
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

    if (!data.type) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Space type is required',
        },
      };
    }

    // Validate space type
    const validTypes: SpaceType[] = ['indoor-tent', 'outdoor-bed', 'greenhouse', 'hydroponic', 'container'];
    if (!validTypes.includes(data.type)) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid space type',
        },
      };
    }

    const spaceData = {
      ...data,
      name: data.name.trim(),
      plantCount: 0, // Initialize with 0 plants
    };

    return this.create(spaceData, data.userId);
  }

  /**
   * Get all spaces for a specific user
   */
  async getUserSpaces(userId: string): Promise<ServiceResult<GrowSpace[]>> {
    if (!userId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      };
    }

    const filters: QueryFilters = {
      // Temporarily removed orderBy to avoid index requirement
      // orderBy: [{ field: 'name', direction: 'asc' }],
    };

    const result = await this.list(filters, userId);
    
    // Sort client-side as a temporary workaround
    if (result.data) {
      result.data.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return result;
  }

  /**
   * Update a space
   */
  async updateSpace(
    id: string,
    updates: UpdateSpaceData,
    userId: string
  ): Promise<ServiceResult<GrowSpace>> {
    if (!id) {
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

    // Validate name if provided
    if (updates.name !== undefined && !updates.name?.trim()) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Space name cannot be empty',
        },
      };
    }

    // Validate space type if provided
    if (updates.type) {
      const validTypes: SpaceType[] = ['indoor-tent', 'outdoor-bed', 'greenhouse', 'hydroponic', 'container'];
      if (!validTypes.includes(updates.type)) {
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid space type',
          },
        };
      }
    }

    // Trim name if provided
    const cleanUpdates = {
      ...updates,
      ...(updates.name && { name: updates.name.trim() }),
    };

    return this.update(id, cleanUpdates, userId);
  }

  /**
   * Delete a space (with validation for existing plants)
   */
  async deleteSpace(id: string, userId: string): Promise<ServiceResult<void>> {
    if (!id) {
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

    // First check if the space exists and get its plant count
    const spaceResult = await this.getById(id, userId);
    if (spaceResult.error) {
      return { error: spaceResult.error };
    }

    const space = spaceResult.data!;
    if (space.plantCount > 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Cannot delete space with ${space.plantCount} active plants. Please move or remove plants first.`,
        },
      };
    }

    return this.delete(id, userId);
  }

  /**
   * Update plant count for a space
   */
  async updatePlantCount(
    spaceId: string,
    plantCount: number,
    userId: string
  ): Promise<ServiceResult<GrowSpace>> {
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

    if (plantCount < 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plant count cannot be negative',
        },
      };
    }

    return this.update(spaceId, { plantCount }, userId);
  }

  /**
   * Subscribe to real-time updates for user's spaces
   */
  subscribeToUserSpaces(
    userId: string,
    callback: (result: ServiceResult<GrowSpace[]>) => void
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
      // Temporarily removed orderBy to avoid index requirement
      // orderBy: [{ field: 'name', direction: 'asc' }],
    };

    return this.subscribe((result) => {
      // Sort client-side as a temporary workaround
      if (result.data) {
        result.data.sort((a, b) => a.name.localeCompare(b.name));
      }
      callback(result);
    }, filters, userId);
  }

  /**
   * Get spaces by type for a user
   */
  async getSpacesByType(userId: string, type: SpaceType): Promise<ServiceResult<GrowSpace[]>> {
    if (!userId) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      };
    }

    if (!type) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Space type is required',
        },
      };
    }

    const filters: QueryFilters = {
      where: [
        { field: 'type', operator: '==', value: type },
      ],
      // Temporarily removed orderBy to avoid index requirement
      // orderBy: [{ field: 'name', direction: 'asc' }],
    };

    const result = await this.list(filters, userId);
    
    // Sort client-side as a temporary workaround
    if (result.data) {
      result.data.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return result;
  }
}

// Export a singleton instance
export const spaceService = new SpaceService();
