import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSpaceStore } from '../../stores/spaceStore';
import { usePlantStore } from '../../stores/plantStore';
import { spaceService } from '../../lib/services/spaceService';
import { plantService } from '../../lib/services/plantService';
import { noteService } from '../../lib/services/noteService';
import { useAuthStore } from '../../stores/authStore';

vi.mock('../../lib/services/spaceService', () => ({
  spaceService: {
    getUserSpaces: vi.fn(),
    createSpace: vi.fn(),
    updateSpace: vi.fn(),
    deleteSpace: vi.fn(),
  },
}));

vi.mock('../../lib/services/plantService', () => ({
  plantService: {
    getUserPlants: vi.fn(),
    getPlantsBySpace: vi.fn(),
    createPlant: vi.fn(),
    updatePlant: vi.fn(),
    deletePlant: vi.fn(),
    movePlant: vi.fn(),
    harvestPlant: vi.fn(),
  },
}));

vi.mock('../../lib/services/noteService', () => ({
  noteService: {
    create: vi.fn(),
  },
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

describe('Creation event logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useSpaceStore.setState({
      spaces: [],
      selectedSpace: null,
      loading: false,
      error: null,
    });
    usePlantStore.setState({
      plants: [],
      selectedPlant: null,
      loading: false,
      error: null,
    });

    vi.mocked(useAuthStore.getState).mockReturnValue({
      user: { uid: 'user-1' },
    } as any);
    vi.mocked(noteService.create).mockResolvedValue({
      id: 'note-1',
      userId: 'user-1',
      content: '',
      category: 'milestone',
      photos: [],
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should log both space and plant creation notes in a combined flow', async () => {
    const createdSpace = {
      id: 'space-new',
      userId: 'user-1',
      name: 'Auto Space',
      type: 'indoor-tent' as const,
      plantCount: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const createdPlant = {
      id: 'plant-new',
      userId: 'user-1',
      spaceId: 'space-new',
      name: 'Auto Plant',
      variety: 'Roma',
      status: 'seedling' as const,
      plantedDate: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    vi.mocked(spaceService.createSpace).mockResolvedValue({
      data: createdSpace,
      error: undefined,
    });
    vi.mocked(plantService.createPlant).mockResolvedValue({
      data: createdPlant,
      error: undefined,
    });

    await useSpaceStore.getState().createSpace({
      userId: 'user-1',
      name: 'Auto Space',
      type: 'indoor-tent',
    });

    await usePlantStore.getState().createPlant({
      userId: 'user-1',
      spaceId: 'space-new',
      name: 'Auto Plant',
      variety: 'Roma',
      status: 'seedling',
      plantedDate: new Date('2024-01-01'),
    });

    expect(noteService.create).toHaveBeenCalledTimes(2);
    expect(noteService.create).toHaveBeenNthCalledWith(
      1,
      {
        content: 'Space created: Auto Space (Indoor Tent)',
        category: 'milestone',
        spaceId: 'space-new',
      },
      'user-1'
    );
    expect(noteService.create).toHaveBeenNthCalledWith(
      2,
      {
        content: 'Plant created: Auto Plant (Roma)',
        category: 'milestone',
        plantId: 'plant-new',
        spaceId: 'space-new',
      },
      'user-1'
    );
  });
});
