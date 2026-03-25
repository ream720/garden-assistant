import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlantStore } from '../../stores/plantStore';
import { useAuthStore } from '../../stores/authStore';
import { plantService } from '../../lib/services/plantService';
import { noteService } from '../../lib/services/noteService';
import type { Plant } from '../../lib/types';

// Mock the plant service
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

// Mock the note service
vi.mock('../../lib/services/noteService', () => ({
  noteService: {
    create: vi.fn(),
  },
}));

// Mock the auth store
vi.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

const mockPlant: Plant = {
  id: 'plant-1',
  spaceId: 'space-1',
  userId: 'user-1',
  name: 'Test Plant',
  variety: 'Test Variety',
  plantedDate: new Date('2024-01-01'),
  status: 'seedling',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('Plant Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset store state
    usePlantStore.setState({
      plants: [],
      selectedPlant: null,
      loading: false,
      error: null,
    });

    // Mock auth user
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

  it('should load plants successfully', async () => {
    vi.mocked(plantService.getUserPlants).mockResolvedValue({
      data: [mockPlant],
      error: undefined,
    });

    const { loadPlants } = usePlantStore.getState();
    await loadPlants();

    const state = usePlantStore.getState();
    expect(state.plants).toEqual([mockPlant]);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('should handle load plants error', async () => {
    vi.mocked(plantService.getUserPlants).mockResolvedValue({
      data: undefined,
      error: { code: 'UNKNOWN_ERROR', message: 'Failed to load plants' },
    });

    const { loadPlants } = usePlantStore.getState();
    await loadPlants();

    const state = usePlantStore.getState();
    expect(state.plants).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Failed to load plants');
  });

  it('should create plant successfully', async () => {
    const newPlant = { ...mockPlant, id: 'plant-2', name: 'New Plant' };
    vi.mocked(plantService.createPlant).mockResolvedValue({
      data: newPlant,
      error: undefined,
    });

    const { createPlant } = usePlantStore.getState();
    const result = await createPlant({
      spaceId: 'space-1',
      userId: 'user-1',
      name: 'New Plant',
      variety: 'Test Variety',
      plantedDate: new Date('2024-01-01'),
      status: 'seedling',
    });

    expect(result).toEqual(newPlant);
    const state = usePlantStore.getState();
    expect(state.plants).toContain(newPlant);
    expect(noteService.create).toHaveBeenCalledWith(
      {
        content: 'Plant created: New Plant (Test Variety)',
        category: 'milestone',
        plantId: 'plant-2',
        spaceId: 'space-1',
      },
      'user-1'
    );
  });

  it('should keep plant creation successful when note logging fails', async () => {
    const newPlant = { ...mockPlant, id: 'plant-3', name: 'Noisy Plant' };
    vi.mocked(plantService.createPlant).mockResolvedValue({
      data: newPlant,
      error: undefined,
    });
    vi.mocked(noteService.create).mockRejectedValueOnce(
      new Error('note write failed')
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { createPlant } = usePlantStore.getState();
    const result = await createPlant({
      spaceId: 'space-1',
      userId: 'user-1',
      name: 'Noisy Plant',
      variety: 'Test Variety',
      plantedDate: new Date('2024-01-01'),
      status: 'seedling',
    });

    expect(result).toEqual(newPlant);
    expect(usePlantStore.getState().plants).toContain(newPlant);
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to log plant creation note:',
      expect.objectContaining({ plantId: 'plant-3' })
    );

    warnSpy.mockRestore();
  });

  it('should use authenticated uid for plant creation note when created plant has no userId field', async () => {
    const newPlant = {
      ...mockPlant,
      id: 'plant-4',
      name: 'No UserId Plant',
      userId: undefined as unknown as string,
    };
    vi.mocked(plantService.createPlant).mockResolvedValue({
      data: newPlant,
      error: undefined,
    });

    const { createPlant } = usePlantStore.getState();
    await createPlant({
      spaceId: 'space-1',
      userId: 'user-1',
      name: 'No UserId Plant',
      variety: 'Test Variety',
      plantedDate: new Date('2024-01-01'),
      status: 'seedling',
    });

    expect(noteService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        plantId: 'plant-4',
      }),
      'user-1'
    );
  });

  it('should update plant successfully', async () => {
    // Set initial state with a plant
    usePlantStore.setState({ plants: [mockPlant] });

    const updatedPlant = { ...mockPlant, name: 'Updated Plant' };
    vi.mocked(plantService.updatePlant).mockResolvedValue({
      data: updatedPlant,
      error: undefined,
    });

    const { updatePlant } = usePlantStore.getState();
    await updatePlant('plant-1', { name: 'Updated Plant' });

    const state = usePlantStore.getState();
    expect(state.plants[0]).toEqual(updatedPlant);
  });

  it('should delete plant successfully', async () => {
    // Set initial state with a plant
    usePlantStore.setState({ plants: [mockPlant] });

    vi.mocked(plantService.deletePlant).mockResolvedValue({
      data: undefined,
      error: undefined,
    });

    const { deletePlant } = usePlantStore.getState();
    await deletePlant('plant-1');

    const state = usePlantStore.getState();
    expect(state.plants).toEqual([]);
  });

  it('should move plant to new space', async () => {
    // Set initial state with a plant
    usePlantStore.setState({ plants: [mockPlant] });

    const movedPlant = { ...mockPlant, spaceId: 'space-2' };
    vi.mocked(plantService.movePlant).mockResolvedValue({
      data: movedPlant,
      error: undefined,
    });

    const { movePlant } = usePlantStore.getState();
    await movePlant('plant-1', 'space-2');

    const state = usePlantStore.getState();
    expect(state.plants[0].spaceId).toBe('space-2');
  });

  it('should harvest plant without creating a linked note by default', async () => {
    // Set initial state with a plant
    usePlantStore.setState({ plants: [mockPlant] });

    const harvestDate = new Date('2024-06-01');
    const harvestedPlant = { 
      ...mockPlant, 
      status: 'harvested' as const,
      actualHarvestDate: harvestDate 
    };
    vi.mocked(plantService.harvestPlant).mockResolvedValue({
      data: harvestedPlant,
      error: undefined,
    });

    const { harvestPlant } = usePlantStore.getState();
    const result = await harvestPlant('plant-1', harvestDate);

    const state = usePlantStore.getState();
    expect(result).toEqual({ noteCreated: false });
    expect(state.plants[0].status).toBe('harvested');
    expect(state.plants[0].actualHarvestDate).toEqual(harvestDate);
    expect(noteService.create).not.toHaveBeenCalled();
  });

  it('should create a linked harvest note when enabled', async () => {
    usePlantStore.setState({ plants: [mockPlant] });

    const harvestDate = new Date('2024-06-01');
    const harvestedPlant = {
      ...mockPlant,
      status: 'harvested' as const,
      actualHarvestDate: harvestDate,
    };
    vi.mocked(plantService.harvestPlant).mockResolvedValue({
      data: harvestedPlant,
      error: undefined,
    });

    const { harvestPlant } = usePlantStore.getState();
    const result = await harvestPlant('plant-1', harvestDate, {
      createLinkedNote: true,
      noteContent: 'Great harvest this cycle.',
      noteTimestamp: harvestDate,
    });

    expect(result).toEqual({ noteCreated: true });
    expect(noteService.create).toHaveBeenCalledWith(
      {
        content: 'Great harvest this cycle.',
        category: 'milestone',
        plantId: 'plant-1',
        spaceId: 'space-1',
        timestamp: harvestDate,
      },
      'user-1'
    );
  });

  it('should use fallback harvest note content when note text is blank', async () => {
    usePlantStore.setState({ plants: [mockPlant] });

    const harvestDate = new Date('2024-06-01');
    const harvestedPlant = {
      ...mockPlant,
      status: 'harvested' as const,
      actualHarvestDate: harvestDate,
    };
    vi.mocked(plantService.harvestPlant).mockResolvedValue({
      data: harvestedPlant,
      error: undefined,
    });

    const { harvestPlant } = usePlantStore.getState();
    const result = await harvestPlant('plant-1', harvestDate, {
      createLinkedNote: true,
      noteContent: '   ',
      noteTimestamp: harvestDate,
    });

    expect(result).toEqual({ noteCreated: true });
    expect(noteService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Harvest recorded for Test Plant.',
      }),
      'user-1'
    );
  });

  it('should keep harvest successful when linked note creation fails', async () => {
    usePlantStore.setState({ plants: [mockPlant] });

    const harvestDate = new Date('2024-06-01');
    const harvestedPlant = {
      ...mockPlant,
      status: 'harvested' as const,
      actualHarvestDate: harvestDate,
    };
    vi.mocked(plantService.harvestPlant).mockResolvedValue({
      data: harvestedPlant,
      error: undefined,
    });
    vi.mocked(noteService.create).mockRejectedValueOnce(
      new Error('note write failed')
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { harvestPlant } = usePlantStore.getState();
    const result = await harvestPlant('plant-1', harvestDate, {
      createLinkedNote: true,
      noteContent: 'Captured harvest details',
      noteTimestamp: harvestDate,
    });

    expect(result).toEqual({
      noteCreated: false,
      noteError: 'note write failed',
    });
    expect(usePlantStore.getState().plants[0].status).toBe('harvested');
    expect(usePlantStore.getState().error).toBe(null);
    expect(warnSpy).toHaveBeenCalledWith(
      'Harvest recorded but linked note creation failed:',
      expect.objectContaining({ plantId: 'plant-1' })
    );

    warnSpy.mockRestore();
  });

  it('should use authenticated uid for harvest note when harvested plant has no userId field', async () => {
    usePlantStore.setState({ plants: [mockPlant] });

    const harvestDate = new Date('2024-06-01');
    const harvestedPlant = {
      ...mockPlant,
      status: 'harvested' as const,
      actualHarvestDate: harvestDate,
      userId: undefined as unknown as string,
    };
    vi.mocked(plantService.harvestPlant).mockResolvedValue({
      data: harvestedPlant,
      error: undefined,
    });

    const { harvestPlant } = usePlantStore.getState();
    const result = await harvestPlant('plant-1', harvestDate, {
      createLinkedNote: true,
      noteContent: 'Harvest note',
      noteTimestamp: harvestDate,
    });

    expect(result).toEqual({ noteCreated: true });
    expect(noteService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Harvest note',
        plantId: 'plant-1',
      }),
      'user-1'
    );
  });

  it('should filter plants by space', () => {
    const plant1 = { ...mockPlant, id: 'plant-1', spaceId: 'space-1' };
    const plant2 = { ...mockPlant, id: 'plant-2', spaceId: 'space-2' };
    
    usePlantStore.setState({ plants: [plant1, plant2] });

    const { getPlantsBySpace } = usePlantStore.getState();
    const space1Plants = getPlantsBySpace('space-1');
    
    expect(space1Plants).toEqual([plant1]);
    expect(space1Plants).not.toContain(plant2);
  });

  it('should select plant', () => {
    const { selectPlant } = usePlantStore.getState();
    selectPlant(mockPlant);

    const state = usePlantStore.getState();
    expect(state.selectedPlant).toEqual(mockPlant);
  });

  it('should handle authentication error', async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({
      user: null,
    } as any);

    const { loadPlants } = usePlantStore.getState();
    await loadPlants();

    const state = usePlantStore.getState();
    expect(state.error).toBe('User not authenticated');
    expect(state.loading).toBe(false);
  });
});
