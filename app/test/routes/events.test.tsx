import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import EventsPage from '../../routes/events';
import type { GrowSpace, Plant, Task } from '../../lib/types';
import type { Note } from '../../lib/types/note';

let mockSearchParams = new URLSearchParams('type=tasks');
const mockSetSearchParams = vi.fn();
const mockLoadTasks = vi.fn();
const mockLoadNotes = vi.fn();
const mockLoadSpaces = vi.fn();
const mockLoadPlants = vi.fn();
const mockCreateNote = vi.fn();
const mockUpdateNote = vi.fn();
const mockDeleteNote = vi.fn();
const mockClearTaskError = vi.fn();
const mockClearNoteError = vi.fn();

let mockTasks: Task[] = [];
let mockNotes: Note[] = [];
let mockSpaces: GrowSpace[] = [];
let mockPlants: Plant[] = [];

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  };
});

vi.mock('../../components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('../../components/routing/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../components/notes/NoteForm', () => ({
  NoteForm: () => <div>Mock Note Form</div>,
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { uid: 'user-1' },
  }),
}));

vi.mock('../../stores/taskStore', () => ({
  useTaskStore: () => ({
    tasks: mockTasks,
    loadTasks: mockLoadTasks,
    loading: false,
    error: null,
    clearError: mockClearTaskError,
  }),
}));

vi.mock('../../stores/noteStore', () => ({
  useNoteStore: Object.assign(
    () => ({
      notes: mockNotes,
      loadNotes: mockLoadNotes,
      loading: false,
      error: null,
      createNote: mockCreateNote,
      updateNote: mockUpdateNote,
      deleteNote: mockDeleteNote,
      clearError: mockClearNoteError,
    }),
    {
      getState: () => ({ notes: mockNotes }),
    }
  ),
}));

vi.mock('../../stores/spaceStore', () => ({
  useSpaceStore: () => ({
    spaces: mockSpaces,
    loadSpaces: mockLoadSpaces,
  }),
}));

vi.mock('../../stores/plantStore', () => ({
  usePlantStore: () => ({
    plants: mockPlants,
    loadPlants: mockLoadPlants,
  }),
}));

const baseSpace: GrowSpace = {
  id: 'space-1',
  userId: 'user-1',
  name: 'Greenhouse',
  type: 'greenhouse',
  plantCount: 1,
  createdAt: new Date('2026-01-01T10:00:00'),
  updatedAt: new Date('2026-01-02T10:00:00'),
};

const basePlant: Plant = {
  id: 'plant-1',
  userId: 'user-1',
  spaceId: 'space-1',
  name: 'Tomato 1',
  variety: 'Roma',
  plantedDate: new Date('2026-02-01T10:00:00'),
  status: 'vegetative',
  createdAt: new Date('2026-02-01T10:00:00'),
  updatedAt: new Date('2026-02-05T10:00:00'),
};

describe('Events route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('type=tasks');
    mockSpaces = [baseSpace];
    mockPlants = [basePlant];
    mockNotes = [];
    mockTasks = [];
  });

  it('shows recurring completed task details including timestamps and context', async () => {
    mockTasks = [
      {
        id: 'task-1',
        userId: 'user-1',
        title: 'Feed tomatoes',
        description: 'Use half-strength nutrients',
        dueDate: new Date('2026-03-10T10:00:00'),
        priority: 'medium',
        status: 'completed',
        plantId: 'plant-1',
        spaceId: 'space-1',
        recurrence: {
          type: 'weekly',
          interval: 2,
          endDate: new Date('2026-03-31T10:00:00'),
        },
        completedAt: new Date('2026-03-11T10:00:00'),
        createdAt: new Date('2026-03-01T10:00:00'),
        updatedAt: new Date('2026-03-11T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Feed tomatoes').length).toBeGreaterThan(0)
    );
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(
      screen.getAllByText('Every 2 weeks until Mar 31, 2026').length
    ).toBeGreaterThan(0);
    expect(screen.getByText('Use half-strength nutrients')).toBeInTheDocument();
    expect(screen.getByText('Tomato 1 (Roma)')).toBeInTheDocument();
    expect(screen.getByText('Greenhouse')).toBeInTheDocument();
    expect(screen.getAllByText(/Mar 11, 2026/).length).toBeGreaterThan(0);
    expect(mockLoadTasks).toHaveBeenCalled();
  });

  it('shows overdue task fallbacks for missing optional fields', async () => {
    mockTasks = [
      {
        id: 'task-2',
        userId: 'user-1',
        title: 'Inspect irrigation',
        dueDate: new Date('2024-01-15T10:00:00'),
        priority: 'low',
        status: 'pending',
        createdAt: new Date('2024-01-01T10:00:00'),
        updatedAt: new Date('2024-01-05T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Inspect irrigation').length).toBeGreaterThan(
        0
      )
    );
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
    expect(screen.getByText('Does not repeat')).toBeInTheDocument();
    expect(screen.getByText('No plant attached')).toBeInTheDocument();
    expect(screen.getByText('No space attached')).toBeInTheDocument();
  });

  it('applies notes deep-link filters and renders note details', async () => {
    mockSearchParams = new URLSearchParams(
      'type=notes&category=issue&spaceId=space-1'
    );
    mockNotes = [
      {
        id: 'note-1',
        userId: 'user-1',
        content: 'Check underside for aphids',
        category: 'issue',
        plantId: 'plant-1',
        spaceId: 'space-1',
        photos: ['https://example.com/photo-1.jpg'],
        timestamp: new Date('2026-03-06T09:00:00'),
        createdAt: new Date('2026-03-06T09:00:00'),
        updatedAt: new Date('2026-03-06T09:05:00'),
      },
      {
        id: 'note-2',
        userId: 'user-1',
        content: 'General greenhouse cleanup',
        category: 'general',
        spaceId: 'space-1',
        photos: [],
        timestamp: new Date('2026-03-05T09:00:00'),
        createdAt: new Date('2026-03-05T09:00:00'),
        updatedAt: new Date('2026-03-05T09:05:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Notes').length).toBeGreaterThan(0);
    });

    expect(
      screen.queryByText('General greenhouse cleanup')
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText('Check underside for aphids').length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Issue').length).toBeGreaterThan(0);
    expect(screen.getByText('Issue note')).toBeInTheDocument();
    expect(screen.getByText('Logged at')).toBeInTheDocument();
    expect(mockLoadNotes).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        category: 'issue',
        spaceId: 'space-1',
      })
    );
  });
});
