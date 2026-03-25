import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Note, CreateNoteData, UpdateNoteData, NoteFilters } from '../../lib/types/note';

// Mock Firebase
vi.mock('../../lib/firebase/config', () => ({
  db: {},
  storage: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((date: Date) => ({ toDate: () => date }))
  }
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn()
}));

import { noteService } from '../../lib/services/noteService';

describe('NoteService', () => {
  const mockUserId = 'user123';
  const mockNoteId = 'note123';
  const mockSpaceId = 'space123';
  const mockPlantId = 'plant123';

  const mockNote: Note = {
    id: mockNoteId,
    userId: mockUserId,
    plantId: undefined,
    spaceId: mockSpaceId,
    content: 'Test note content',
    category: 'observation',
    photos: [],
    timestamp: new Date('2024-01-01T10:00:00Z'),
    createdAt: new Date('2024-01-01T09:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a note without photos', async () => {
      const createData: CreateNoteData = {
        content: 'Test note content',
        category: 'observation',
        spaceId: mockSpaceId,
      };

      const createSpy = vi.spyOn(noteService, 'create').mockResolvedValue(mockNote);

      const result = await noteService.create(createData, mockUserId);

      expect(createSpy).toHaveBeenCalledWith(createData, mockUserId);
      expect(result).toEqual(mockNote);
    });

    it('should create a note with photos', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const createData: CreateNoteData = {
        content: 'Test note with photo',
        category: 'milestone',
        plantId: mockPlantId,
        photos: [mockFile],
      };

      const noteWithPhotos: Note = {
        ...mockNote,
        plantId: mockPlantId,
        content: 'Test note with photo',
        category: 'milestone',
        photos: ['https://storage.example.com/photo.jpg'],
      };

      const createSpy = vi.spyOn(noteService, 'create').mockResolvedValue(noteWithPhotos);

      const result = await noteService.create(createData, mockUserId);

      expect(createSpy).toHaveBeenCalledWith(createData, mockUserId);
      expect(result.photos).toEqual(['https://storage.example.com/photo.jpg']);
    });

    it('should handle creation errors', async () => {
      const createData: CreateNoteData = {
        content: 'Test note',
        category: 'observation',
      };

      vi.spyOn(noteService, 'create').mockRejectedValue(new Error('Failed to create note'));

      await expect(noteService.create(createData, mockUserId)).rejects.toThrow('Failed to create note');
    });
  });

  describe('getById', () => {
    it('should get a note by id', async () => {
      const getByIdSpy = vi.spyOn(noteService, 'getById').mockResolvedValue(mockNote);

      const result = await noteService.getById(mockNoteId, mockUserId);

      expect(getByIdSpy).toHaveBeenCalledWith(mockNoteId, mockUserId);
      expect(result).toEqual(mockNote);
    });

    it('should return null if note does not exist', async () => {
      vi.spyOn(noteService, 'getById').mockResolvedValue(null);

      const result = await noteService.getById(mockNoteId, mockUserId);

      expect(result).toBeNull();
    });

    it('should handle get errors', async () => {
      vi.spyOn(noteService, 'getById').mockRejectedValue(new Error('Failed to get note'));

      await expect(noteService.getById(mockNoteId, mockUserId)).rejects.toThrow('Failed to get note');
    });
  });

  describe('update', () => {
    it('should update a note', async () => {
      const updateData: UpdateNoteData = {
        content: 'Updated content',
        category: 'feeding',
      };

      const mockUpdatedNote: Note = {
        ...mockNote,
        content: 'Updated content',
        category: 'feeding',
        updatedAt: new Date('2024-01-01T11:00:00Z'),
      };

      const updateSpy = vi.spyOn(noteService, 'update').mockResolvedValue(mockUpdatedNote);

      const result = await noteService.update(mockNoteId, updateData, mockUserId);

      expect(updateSpy).toHaveBeenCalledWith(mockNoteId, updateData, mockUserId);
      expect(result).toEqual(mockUpdatedNote);
      expect(result.content).toBe('Updated content');
      expect(result.category).toBe('feeding');
    });

    it('should handle update errors', async () => {
      const updateData: UpdateNoteData = {
        content: 'Updated content',
      };

      vi.spyOn(noteService, 'update').mockRejectedValue(new Error('Failed to update note'));

      await expect(noteService.update(mockNoteId, updateData, mockUserId)).rejects.toThrow('Failed to update note');
    });
  });

  describe('delete', () => {
    it('should delete a note without photos', async () => {
      const deleteSpy = vi.spyOn(noteService, 'delete').mockResolvedValue(undefined);

      await noteService.delete(mockNoteId, mockUserId);

      expect(deleteSpy).toHaveBeenCalledWith(mockNoteId, mockUserId);
    });

    it('should delete a note with photos', async () => {
      const deleteSpy = vi.spyOn(noteService, 'delete').mockResolvedValue(undefined);

      await noteService.delete(mockNoteId, mockUserId);

      expect(deleteSpy).toHaveBeenCalledWith(mockNoteId, mockUserId);
    });

    it('should handle delete errors', async () => {
      vi.spyOn(noteService, 'delete').mockRejectedValue(new Error('Failed to delete note'));

      await expect(noteService.delete(mockNoteId, mockUserId)).rejects.toThrow('Failed to delete note');
    });
  });

  describe('list', () => {
    it('should list notes for a user', async () => {
      const mockNotes: Note[] = [
        {
          ...mockNote,
          id: 'note1',
          content: 'Note 1',
        },
        {
          ...mockNote,
          id: 'note2',
          content: 'Note 2',
          category: 'feeding',
          timestamp: new Date('2024-01-01T11:00:00Z'),
        },
      ];

      const listSpy = vi.spyOn(noteService, 'list').mockResolvedValue(mockNotes);

      const result = await noteService.list(mockUserId);

      expect(listSpy).toHaveBeenCalledWith(mockUserId);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('note1');
      expect(result[1].id).toBe('note2');
    });

    it('should filter notes by plant id', async () => {
      const filters: NoteFilters = {
        plantId: mockPlantId,
      };

      const listSpy = vi.spyOn(noteService, 'list').mockResolvedValue([]);

      await noteService.list(mockUserId, filters);

      expect(listSpy).toHaveBeenCalledWith(mockUserId, filters);
    });

    it('should filter notes by search term', async () => {
      const filters: NoteFilters = {
        searchTerm: 'watering',
      };

      const matchingNote: Note = {
        ...mockNote,
        id: 'note1',
        content: 'This is about watering',
      };

      const listSpy = vi.spyOn(noteService, 'list').mockResolvedValue([matchingNote]);

      const result = await noteService.list(mockUserId, filters);

      expect(listSpy).toHaveBeenCalledWith(mockUserId, filters);
      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('watering');
    });

    it('should handle list errors', async () => {
      vi.spyOn(noteService, 'list').mockRejectedValue(new Error('Failed to list notes'));

      await expect(noteService.list(mockUserId)).rejects.toThrow('Failed to list notes');
    });
  });

  describe('subscribe', () => {
    it('should set up real-time subscription', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      const subscribeSpy = vi.spyOn(noteService, 'subscribe').mockReturnValue(mockUnsubscribe);

      const unsubscribe = noteService.subscribe(mockUserId, mockCallback);

      expect(subscribeSpy).toHaveBeenCalledWith(mockUserId, mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should handle subscription errors', () => {
      const mockCallback = vi.fn();

      vi.spyOn(noteService, 'subscribe').mockImplementation(() => {
        console.error('Error in notes subscription:', new Error('Subscription error'));
        return () => {};
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      noteService.subscribe(mockUserId, mockCallback);

      expect(consoleSpy).toHaveBeenCalledWith('Error in notes subscription:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});
