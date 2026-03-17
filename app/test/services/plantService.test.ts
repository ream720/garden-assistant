import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { PlantService } from '../../lib/services/plantService';
import { spaceService } from '../../lib/services/spaceService';
import type { Plant, PlantStatus, GrowSpace } from '../../lib/types';

// Mock the base service
vi.mock('../../lib/services/baseService', () => ({
  BaseService: class MockBaseService {
    create = vi.fn();
    getById = vi.fn();
    update = vi.fn();
    delete = vi.fn();
    list = vi.fn();
    subscribe = vi.fn();
    handleError = vi.fn();
  },
}));

// Mock the space service
vi.mock('../../lib/services/spaceService', () => ({
  spaceService: {
    getById: vi.fn(),
    updatePlantCount: vi.fn(),
  },
}));

describe('PlantService', () => {
  let service: PlantService;
  let mockCreate: Mock;
  let mockGetById: Mock;
  let mockUpdate: Mock;
  let mockDelete: Mock;
  let mockList: Mock;
  let mockSubscribe: Mock;
  let mockSpaceGetById: Mock;
  let mockSpaceUpdatePlantCount: Mock;

  // Mock data shared across tests
  const mockSpace: GrowSpace = {
    id: 'space123',
    userId: 'user123',
    name: 'Garden',
    type: 'outdoor-bed',
    plantCount: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlantService();

    // Get references to the mocked methods
    mockCreate = service.create as Mock;
    mockGetById = service.getById as Mock;
    mockUpdate = service.update as Mock;
    mockDelete = service.delete as Mock;
    mockList = service.list as Mock;
    mockSubscribe = service.subscribe as Mock;

    mockSpaceGetById = spaceService.getById as Mock;
    mockSpaceUpdatePlantCount = spaceService.updatePlantCount as Mock;
  });

  describe('createPlant', () => {
    const validPlantData = {
      spaceId: 'space123',
      userId: 'user123',
      name: 'Tomato Plant',
      variety: 'Cherry Tomato',
      plantedDate: new Date('2024-01-01'),
      seedSource: 'Local Store',
      notes: 'Planted in good soil',
    };



    it('should create a plant successfully', async () => {
      const mockPlant: Plant = {
        id: 'plant123',
        ...validPlantData,
        status: 'seedling',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSpaceGetById.mockResolvedValue({ data: mockSpace });
      mockCreate.mockResolvedValue({ data: mockPlant });
      mockSpaceUpdatePlantCount.mockResolvedValue({ data: mockSpace });

      const result = await service.createPlant(validPlantData);

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockPlant);
      expect(mockCreate).toHaveBeenCalledWith({
        ...validPlantData,
        status: 'seedling',
      });
      expect(mockSpaceUpdatePlantCount).toHaveBeenCalledWith('space123', 3);
    });

    it('should validate required name field', async () => {
      const result = await service.createPlant({
        ...validPlantData,
        name: '',
      });

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Plant name is required',
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should allow empty variety values', async () => {
      const mockPlant: Plant = {
        id: 'plant-empty-variety',
        ...validPlantData,
        variety: '',
        status: 'seedling',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSpaceGetById.mockResolvedValue({ data: mockSpace });
      mockCreate.mockResolvedValue({ data: mockPlant });
      mockSpaceUpdatePlantCount.mockResolvedValue({ data: mockSpace });

      const result = await service.createPlant({
        ...validPlantData,
        variety: '',
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockPlant);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          variety: '',
          status: 'seedling',
        })
      );
    });

    it('should validate space ownership', async () => {
      const wrongUserSpace = { ...mockSpace, userId: 'different-user' };
      mockSpaceGetById.mockResolvedValue({ data: wrongUserSpace });

      const result = await service.createPlant(validPlantData);

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to add plants to this space',
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should validate space exists', async () => {
      mockSpaceGetById.mockResolvedValue({ error: { code: 'NOT_FOUND', message: 'Space not found' } });

      const result = await service.createPlant(validPlantData);

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid space ID',
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should validate plantedDate is required', async () => {
      const result = await service.createPlant({
        ...validPlantData,
        plantedDate: null as any,
      });

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Planted date is required',
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('getUserPlants - date sorting', () => {
    it('should sort plants by plantedDate in descending order (native Date objects)', async () => {
      const plants: Plant[] = [
        {
          id: 'plant1', spaceId: 'space123', userId: 'user123',
          name: 'Old Plant', variety: 'V1',
          plantedDate: new Date('2024-01-01'),
          status: 'seedling', createdAt: new Date(), updatedAt: new Date(),
        },
        {
          id: 'plant2', spaceId: 'space123', userId: 'user123',
          name: 'New Plant', variety: 'V2',
          plantedDate: new Date('2024-06-15'),
          status: 'vegetative', createdAt: new Date(), updatedAt: new Date(),
        },
        {
          id: 'plant3', spaceId: 'space123', userId: 'user123',
          name: 'Middle Plant', variety: 'V3',
          plantedDate: new Date('2024-03-10'),
          status: 'flowering', createdAt: new Date(), updatedAt: new Date(),
        },
      ];

      mockList.mockResolvedValue({ data: [...plants] });

      const result = await service.getUserPlants('user123');

      expect(result.error).toBeUndefined();
      expect(result.data).toHaveLength(3);
      // Descending: newest first
      expect(result.data![0].id).toBe('plant2'); // Jun 15
      expect(result.data![1].id).toBe('plant3'); // Mar 10
      expect(result.data![2].id).toBe('plant1'); // Jan 01
    });

    it('should sort plants by plantedDate when dates are ISO strings (Firestore edge case)', async () => {
      // Simulate Firestore returning string dates instead of Date objects
      const plants: Plant[] = [
        {
          id: 'plant1', spaceId: 'space123', userId: 'user123',
          name: 'Old Plant', variety: 'V1',
          plantedDate: '2024-01-01T00:00:00.000Z' as any,
          status: 'seedling', createdAt: new Date(), updatedAt: new Date(),
        },
        {
          id: 'plant2', spaceId: 'space123', userId: 'user123',
          name: 'New Plant', variety: 'V2',
          plantedDate: '2024-06-15T00:00:00.000Z' as any,
          status: 'vegetative', createdAt: new Date(), updatedAt: new Date(),
        },
      ];

      mockList.mockResolvedValue({ data: [...plants] });

      const result = await service.getUserPlants('user123');

      expect(result.error).toBeUndefined();
      expect(result.data).toHaveLength(2);
      // Should still sort correctly even with string dates
      expect(result.data![0].id).toBe('plant2'); // Jun 15 (newer)
      expect(result.data![1].id).toBe('plant1'); // Jan 01 (older)
    });

    it('should validate userId is required for getUserPlants', async () => {
      const result = await service.getUserPlants('');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'User ID is required',
      });
      expect(mockList).not.toHaveBeenCalled();
    });
  });

  describe('getSpacePlants', () => {
    it('should get space plants successfully', async () => {
      const mockPlants: Plant[] = [
        {
          id: 'plant1',
          spaceId: 'space123',
          userId: 'user123',
          name: 'Plant 1',
          variety: 'Variety 1',
          plantedDate: new Date(),
          status: 'seedling',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockList.mockResolvedValue({ data: mockPlants });

      const result = await service.getSpacePlants('space123', 'user123');

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockPlants);
      // Now calls getUserPlants first, then filters in memory
      expect(mockList).toHaveBeenCalledWith({
        where: [
          { field: 'userId', operator: '==', value: 'user123' },
        ],
      });
    });

    it('should validate spaceId', async () => {
      const result = await service.getSpacePlants('', 'user123');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Space ID is required',
      });
      expect(mockList).not.toHaveBeenCalled();
    });
  });

  describe('movePlant', () => {
    const mockPlant: Plant = {
      id: 'plant123',
      spaceId: 'space123',
      userId: 'user123',
      name: 'Plant',
      variety: 'Variety',
      plantedDate: new Date(),
      status: 'vegetative',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockOldSpace: GrowSpace = {
      id: 'space123',
      userId: 'user123',
      name: 'Old Space',
      type: 'outdoor-bed',
      plantCount: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockNewSpace: GrowSpace = {
      id: 'space456',
      userId: 'user123',
      name: 'New Space',
      type: 'greenhouse',
      plantCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should move a plant successfully', async () => {
      const updatedPlant = { ...mockPlant, spaceId: 'space456' };

      mockGetById.mockResolvedValue({ data: mockPlant });
      mockSpaceGetById
        .mockResolvedValueOnce({ data: mockNewSpace })
        .mockResolvedValueOnce({ data: mockOldSpace });
      mockUpdate.mockResolvedValue({ data: updatedPlant });
      mockSpaceUpdatePlantCount.mockResolvedValue({ data: mockSpace });

      const result = await service.movePlant('plant123', {
        newSpaceId: 'space456',
        notes: 'Moved to greenhouse',
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(updatedPlant);
      expect(mockUpdate).toHaveBeenCalledWith('plant123', {
        spaceId: 'space456',
        notes: 'Moved to greenhouse',
      });
      expect(mockSpaceUpdatePlantCount).toHaveBeenCalledWith('space123', 2);
      expect(mockSpaceUpdatePlantCount).toHaveBeenCalledWith('space456', 2);
    });

    it('should prevent moving to same space', async () => {
      mockGetById.mockResolvedValue({ data: mockPlant });
      mockSpaceGetById.mockResolvedValue({ data: mockSpace });

      const result = await service.movePlant('plant123', {
        newSpaceId: 'space123',
      });

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Plant is already in the specified space',
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should validate new space ownership', async () => {
      const wrongUserSpace = { ...mockNewSpace, userId: 'different-user' };

      mockGetById.mockResolvedValue({ data: mockPlant });
      mockSpaceGetById.mockResolvedValue({ data: wrongUserSpace });
      mockUpdate.mockResolvedValue({ error: { code: 'PERMISSION_DENIED', message: 'Permission denied' } });

      const result = await service.movePlant('plant123', {
        newSpaceId: 'space456',
      });

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to move plants to this space',
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('harvestPlant', () => {
    it('should harvest a plant successfully', async () => {
      const harvestDate = new Date('2024-06-01');
      const harvestedPlant: Plant = {
        id: 'plant123',
        spaceId: 'space123',
        userId: 'user123',
        name: 'Plant',
        variety: 'Variety',
        plantedDate: new Date('2024-01-01'),
        status: 'harvested',
        actualHarvestDate: harvestDate,
        notes: 'Great harvest!',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUpdate.mockResolvedValue({ data: harvestedPlant });

      const result = await service.harvestPlant('plant123', harvestDate, 'Great harvest!');

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(harvestedPlant);
      expect(mockUpdate).toHaveBeenCalledWith('plant123', {
        status: 'harvested',
        actualHarvestDate: harvestDate,
        notes: 'Great harvest!',
      });
    });

    it('should validate plant ID', async () => {
      const result = await service.harvestPlant('', new Date(), 'Notes');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Plant ID is required',
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should validate harvest date', async () => {
      const result = await service.harvestPlant('plant123', null as any, 'Notes');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Harvest date is required',
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('removePlant', () => {
    const mockPlant: Plant = {
      id: 'plant123',
      spaceId: 'space123',
      userId: 'user123',
      name: 'Plant',
      variety: 'Variety',
      plantedDate: new Date(),
      status: 'vegetative',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should remove a plant successfully', async () => {
      const removedPlant = { ...mockPlant, status: 'removed' as PlantStatus };

      mockGetById.mockResolvedValue({ data: mockPlant });
      mockUpdate.mockResolvedValue({ data: removedPlant });
      mockSpaceGetById.mockResolvedValue({ data: mockSpace });
      mockSpaceUpdatePlantCount.mockResolvedValue({ data: mockSpace });

      const result = await service.removePlant('plant123', 'Plant died');

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(removedPlant);
      expect(mockUpdate).toHaveBeenCalledWith('plant123', {
        status: 'removed',
        notes: 'Plant died',
      });
      expect(mockSpaceUpdatePlantCount).toHaveBeenCalledWith('space123', 1);
    });

    it('should not update plant count if already removed', async () => {
      const alreadyRemovedPlant = { ...mockPlant, status: 'removed' as PlantStatus };
      const removedPlant = { ...alreadyRemovedPlant, notes: 'Updated notes' };

      mockGetById.mockResolvedValue({ data: alreadyRemovedPlant });
      mockUpdate.mockResolvedValue({ data: removedPlant });

      const result = await service.removePlant('plant123', 'Updated notes');

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(removedPlant);
      expect(mockSpaceUpdatePlantCount).not.toHaveBeenCalled();
    });
  });

  describe('getPlantsByStatus', () => {
    it('should get plants by status successfully', async () => {
      const mockPlants: Plant[] = [
        {
          id: 'plant1',
          spaceId: 'space123',
          userId: 'user123',
          name: 'Plant 1',
          variety: 'Variety 1',
          plantedDate: new Date(),
          status: 'flowering',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockList.mockResolvedValue({ data: mockPlants });

      const result = await service.getPlantsByStatus('user123', 'flowering');

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockPlants);
      expect(mockList).toHaveBeenCalledWith({
        where: [
          { field: 'userId', operator: '==', value: 'user123' },
          { field: 'status', operator: '==', value: 'flowering' },
        ],
        orderBy: [{ field: 'plantedDate', direction: 'desc' }],
      });
    });

    it('should validate status', async () => {
      const result = await service.getPlantsByStatus('user123', 'invalid-status' as PlantStatus);

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid plant status',
      });
      expect(mockList).not.toHaveBeenCalled();
    });
  });
});
