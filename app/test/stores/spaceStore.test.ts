import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSpaceStore } from '../../stores/spaceStore';
import { useAuthStore } from '../../stores/authStore';
import { spaceService } from '../../lib/services/spaceService';
import { noteService } from '../../lib/services/noteService';
import type { GrowSpace } from '../../lib/types';

vi.mock('../../lib/services/spaceService', () => ({
  spaceService: {
    getUserSpaces: vi.fn(),
    createSpace: vi.fn(),
    updateSpace: vi.fn(),
    deleteSpace: vi.fn(),
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

const mockSpace: GrowSpace = {
  id: 'space-1',
  userId: 'user-1',
  name: 'Starter Tent',
  type: 'indoor-tent',
  plantCount: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('Space Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useSpaceStore.setState({
      spaces: [],
      selectedSpace: null,
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

  it('should create space successfully and log a milestone note event', async () => {
    const newSpace: GrowSpace = {
      ...mockSpace,
      id: 'space-2',
      name: 'Propagation Dome',
      type: 'greenhouse',
    };
    vi.mocked(spaceService.createSpace).mockResolvedValue({
      data: newSpace,
      error: undefined,
    });

    const { createSpace } = useSpaceStore.getState();
    const result = await createSpace({
      userId: 'user-1',
      name: 'Propagation Dome',
      type: 'greenhouse',
    });

    expect(result).toEqual(newSpace);
    expect(useSpaceStore.getState().spaces).toContain(newSpace);
    expect(noteService.create).toHaveBeenCalledWith(
      {
        content: 'Space created: Propagation Dome (Greenhouse)',
        category: 'milestone',
        spaceId: 'space-2',
      },
      'user-1'
    );
  });

  it('should keep space creation successful when note logging fails', async () => {
    const newSpace: GrowSpace = {
      ...mockSpace,
      id: 'space-3',
      name: 'Balcony Planters',
      type: 'container',
    };
    vi.mocked(spaceService.createSpace).mockResolvedValue({
      data: newSpace,
      error: undefined,
    });
    vi.mocked(noteService.create).mockRejectedValueOnce(
      new Error('note write failed')
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { createSpace } = useSpaceStore.getState();
    const result = await createSpace({
      userId: 'user-1',
      name: 'Balcony Planters',
      type: 'container',
    });

    expect(result).toEqual(newSpace);
    expect(useSpaceStore.getState().spaces).toContain(newSpace);
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to log space creation note:',
      expect.objectContaining({ spaceId: 'space-3' })
    );

    warnSpy.mockRestore();
  });
});
