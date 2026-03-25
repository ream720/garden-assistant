import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { SpaceService } from '../../lib/services/spaceService';
import type { GrowSpace, SpaceType } from '../../lib/types';

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

describe('SpaceService', () => {
  let service: SpaceService;
  let mockCreate: Mock;
  let mockGetById: Mock;
  let mockUpdate: Mock;
  let mockDelete: Mock;
  let mockList: Mock;
  let mockSubscribe: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SpaceService();
    
    // Get references to the mocked methods
    mockCreate = service.create as Mock;
    mockGetById = service.getById as Mock;
    mockUpdate = service.update as Mock;
    mockDelete = service.delete as Mock;
    mockList = service.list as Mock;
    mockSubscribe = service.subscribe as Mock;
  });

  describe('createSpace', () => {
    const validSpaceData = {
      userId: 'user123',
      name: 'My Garden',
      type: 'outdoor-bed' as SpaceType,
      description: 'A beautiful outdoor garden',
    };

    it('should create a space successfully', async () => {
      const mockSpace: GrowSpace = {
        id: 'space123',
        ...validSpaceData,
        plantCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreate.mockResolvedValue({ data: mockSpace });

      const result = await service.createSpace(validSpaceData);

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockSpace);
      expect(mockCreate).toHaveBeenCalledWith({
        ...validSpaceData,
        plantCount: 0,
      }, 'user123');
    });

    it('should validate required name field', async () => {
      const result = await service.createSpace({
        ...validSpaceData,
        name: '',
      });

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Space name is required',
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should validate required userId field', async () => {
      const result = await service.createSpace({
        ...validSpaceData,
        userId: '',
      });

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'User ID is required',
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should validate required type field', async () => {
      const result = await service.createSpace({
        ...validSpaceData,
        type: '' as SpaceType,
      });

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Space type is required',
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should validate space type', async () => {
      const result = await service.createSpace({
        ...validSpaceData,
        type: 'invalid-type' as SpaceType,
      });

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid space type',
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should trim space name', async () => {
      const mockSpace: GrowSpace = {
        id: 'space123',
        ...validSpaceData,
        name: 'My Garden',
        plantCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreate.mockResolvedValue({ data: mockSpace });

      await service.createSpace({
        ...validSpaceData,
        name: '  My Garden  ',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        ...validSpaceData,
        name: 'My Garden',
        plantCount: 0,
      }, 'user123');
    });
  });

  describe('getUserSpaces', () => {
    it('should get user spaces successfully', async () => {
      const mockSpaces: GrowSpace[] = [
        {
          id: 'space1',
          userId: 'user123',
          name: 'Garden 1',
          type: 'outdoor-bed',
          plantCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockList.mockResolvedValue({ data: mockSpaces });

      const result = await service.getUserSpaces('user123');

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockSpaces);
      expect(mockList).toHaveBeenCalledWith({
        // orderBy removed due to Firestore index requirements
      }, 'user123');
    });

    it('should validate userId', async () => {
      const result = await service.getUserSpaces('');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'User ID is required',
      });
      expect(mockList).not.toHaveBeenCalled();
    });
  });

  describe('updateSpace', () => {
    it('should update a space successfully', async () => {
      const mockSpace: GrowSpace = {
        id: 'space123',
        userId: 'user123',
        name: 'Updated Garden',
        type: 'greenhouse',
        plantCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUpdate.mockResolvedValue({ data: mockSpace });

      const result = await service.updateSpace('space123', {
        name: 'Updated Garden',
        type: 'greenhouse',
      }, 'user123');

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockSpace);
      expect(mockUpdate).toHaveBeenCalledWith('space123', {
        name: 'Updated Garden',
        type: 'greenhouse',
      }, 'user123');
    });

    it('should validate space ID', async () => {
      const result = await service.updateSpace('', { name: 'Updated' }, 'user123');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Space ID is required',
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should validate name is not empty', async () => {
      const result = await service.updateSpace('space123', { name: '' }, 'user123');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Space name cannot be empty',
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should validate space type', async () => {
      const result = await service.updateSpace('space123', {
        type: 'invalid-type' as SpaceType,
      }, 'user123');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid space type',
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('deleteSpace', () => {
    it('should delete a space with no plants', async () => {
      const mockSpace: GrowSpace = {
        id: 'space123',
        userId: 'user123',
        name: 'Empty Garden',
        type: 'outdoor-bed',
        plantCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetById.mockResolvedValue({ data: mockSpace });
      mockDelete.mockResolvedValue({ data: undefined });

      const result = await service.deleteSpace('space123', 'user123');

      expect(result.error).toBeUndefined();
      expect(mockDelete).toHaveBeenCalledWith('space123', 'user123');
    });

    it('should prevent deletion of space with plants', async () => {
      const mockSpace: GrowSpace = {
        id: 'space123',
        userId: 'user123',
        name: 'Garden with Plants',
        type: 'outdoor-bed',
        plantCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetById.mockResolvedValue({ data: mockSpace });

      const result = await service.deleteSpace('space123', 'user123');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Cannot delete space with 3 active plants. Please move or remove plants first.',
      });
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should validate space ID', async () => {
      const result = await service.deleteSpace('', 'user123');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Space ID is required',
      });
      expect(mockGetById).not.toHaveBeenCalled();
    });
  });

  describe('updatePlantCount', () => {
    it('should update plant count successfully', async () => {
      const mockSpace: GrowSpace = {
        id: 'space123',
        userId: 'user123',
        name: 'Garden',
        type: 'outdoor-bed',
        plantCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUpdate.mockResolvedValue({ data: mockSpace });

      const result = await service.updatePlantCount('space123', 5, 'user123');

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockSpace);
      expect(mockUpdate).toHaveBeenCalledWith('space123', { plantCount: 5 }, 'user123');
    });

    it('should validate space ID', async () => {
      const result = await service.updatePlantCount('', 5, 'user123');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Space ID is required',
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should validate plant count is not negative', async () => {
      const result = await service.updatePlantCount('space123', -1, 'user123');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Plant count cannot be negative',
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToUserSpaces', () => {
    it('should subscribe to user spaces', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();
      mockSubscribe.mockReturnValue(mockUnsubscribe);

      const unsubscribe = service.subscribeToUserSpaces('user123', mockCallback);

      expect(mockSubscribe).toHaveBeenCalledWith(
        expect.any(Function),
        {
          // orderBy removed due to Firestore index requirements
        },
        'user123'
      );
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should handle missing userId', () => {
      const mockCallback = vi.fn();

      const unsubscribe = service.subscribeToUserSpaces('', mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      });
      expect(typeof unsubscribe).toBe('function');
    });
  });
});
