import { create } from 'zustand';
import type { Note, CreateNoteData, UpdateNoteData, NoteFilters } from '../lib/types/note';
import { noteService } from '../lib/services/noteService';
import { useAuthStore } from './authStore';

interface NoteState {
  notes: Note[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  selectedCategory: string | null;
  
  // Actions
  createNote: (data: CreateNoteData, userId: string) => Promise<void>;
  updateNote: (id: string, updates: UpdateNoteData) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  loadNotes: (userId: string, filters?: NoteFilters) => Promise<void>;
  subscribeToNotes: (userId: string, filters?: NoteFilters) => () => void;
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  loading: false,
  error: null,
  searchTerm: '',
  selectedCategory: null,

  createNote: async (data: CreateNoteData, userId: string) => {
    set({ loading: true, error: null });
    try {
      const newNote = await noteService.create(data, userId);
      set(state => ({
        notes: [newNote, ...state.notes],
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create note',
        loading: false 
      });
      throw error;
    }
  },

  updateNote: async (id: string, updates: UpdateNoteData) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      set({
        error: 'User not authenticated',
        loading: false,
      });
      throw new Error('User not authenticated');
    }

    set({ loading: true, error: null });
    try {
      const updatedNote = await noteService.update(id, updates, user.uid);
      set(state => ({
        notes: state.notes.map(note => 
          note.id === id ? updatedNote : note
        ),
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update note',
        loading: false 
      });
      throw error;
    }
  },

  deleteNote: async (id: string) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      set({
        error: 'User not authenticated',
        loading: false,
      });
      throw new Error('User not authenticated');
    }

    set({ loading: true, error: null });
    try {
      await noteService.delete(id, user.uid);
      set(state => ({
        notes: state.notes.filter(note => note.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete note',
        loading: false 
      });
      throw error;
    }
  },

  loadNotes: async (userId: string, filters?: NoteFilters) => {
    set({ loading: true, error: null });
    try {
      const notes = await noteService.list(userId, filters);
      set({ notes, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load notes',
        loading: false,
        notes: []
      });
    }
  },

  subscribeToNotes: (userId: string, filters?: NoteFilters) => {
    set({ loading: true, error: null });
    
    const unsubscribe = noteService.subscribe(
      userId,
      (notes) => {
        set({ notes, loading: false, error: null });
      },
      filters
    );

    return unsubscribe;
  },

  setSearchTerm: (term: string) => {
    set({ searchTerm: term });
  },

  setSelectedCategory: (category: string | null) => {
    set({ selectedCategory: category });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      notes: [],
      loading: false,
      error: null,
      searchTerm: '',
      selectedCategory: null,
    });
  },
}));
