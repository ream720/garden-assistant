import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import EventsPage from '../../routes/events';
import type { GrowSpace, Plant, Task } from '../../lib/types';
import type { Note, NoteCategory } from '../../lib/types/note';

let mockSearchParams = new URLSearchParams('type=tasks');
const mockSetSearchParams = vi.fn();
const mockLoadTasks = vi.fn();
const mockLoadNotes = vi.fn();
const mockLoadSpaces = vi.fn();
const mockLoadPlants = vi.fn();
const mockCreateNote = vi.fn();
const mockCreateTask = vi.fn();
const mockCompleteTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();
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
  DashboardLayout: ({
    children,
    title,
  }: {
    children: ReactNode;
    title?: string;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

vi.mock('../../components/routing/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../components/notes/NoteForm', () => ({
  NoteForm: () => <div>Mock Note Form</div>,
}));

vi.mock('../../components/tasks/TaskForm', () => ({
  TaskForm: ({
    task,
    onSubmit,
    onCancel,
  }: {
    task?: Task;
    onSubmit: (
      data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
    ) => Promise<void>;
    onCancel: () => void;
  }) => (
    <div>
      <p>{task ? `Editing ${task.title}` : 'Creating new task'}</p>
      <button
        type="button"
        onClick={() =>
          void onSubmit({
            userId: 'user-1',
            title: task ? `Updated ${task.title}` : 'New task from form',
            description: 'Task form payload',
            dueDate: new Date('2026-04-01T10:00:00'),
            priority: 'high',
            status: task?.status ?? 'pending',
            spaceId: 'space-1',
            plantId: 'plant-1',
            completedAt: task?.completedAt,
            recurrence: undefined,
          })
        }
      >
        Submit Task Form
      </button>
      <button type="button" onClick={onCancel}>
        Cancel Task Form
      </button>
    </div>
  ),
}));

vi.mock('../../components/tasks/TaskCompletionDialog', () => ({
  TaskCompletionDialog: ({
    task,
    open,
    defaultNoteCategory,
    onComplete,
  }: {
    task: Task | null;
    open: boolean;
    defaultNoteCategory?: NoteCategory;
    onComplete: (
      taskId: string,
      noteData?: {
        content: string;
        category: NoteCategory;
        plantId?: string;
        spaceId?: string;
      }
    ) => Promise<void>;
  }) => {
    if (!open || !task) return null;

    return (
      <div role="dialog" aria-label="Mock Task Completion Dialog">
        <p>Default category: {defaultNoteCategory ?? 'none'}</p>
        <button type="button" onClick={() => void onComplete(task.id)}>
          Complete without note
        </button>
        <button
          type="button"
          onClick={() =>
            void onComplete(task.id, {
              content: 'Linked completion note',
              category: 'milestone',
              plantId: task.plantId,
              spaceId: task.spaceId,
            })
          }
        >
          Complete with note
        </button>
      </div>
    );
  },
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
    createTask: mockCreateTask,
    updateTask: mockUpdateTask,
    completeTask: mockCompleteTask,
    deleteTask: mockDeleteTask,
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
    mockCreateNote.mockResolvedValue(undefined);
    mockCreateTask.mockResolvedValue({
      id: 'task-new',
      userId: 'user-1',
      title: 'New task from form',
      description: 'Task form payload',
      dueDate: new Date('2026-04-01T10:00:00'),
      priority: 'high',
      status: 'pending',
      spaceId: 'space-1',
      plantId: 'plant-1',
      recurrence: undefined,
      createdAt: new Date('2026-03-01T10:00:00'),
      updatedAt: new Date('2026-03-01T10:00:00'),
    });
    mockCompleteTask.mockResolvedValue(undefined);
    mockUpdateTask.mockResolvedValue(undefined);
    mockDeleteTask.mockResolvedValue(undefined);
  });

  it('defaults /events to notes view when type is missing', async () => {
    mockSearchParams = new URLSearchParams('');
    mockNotes = [
      {
        id: 'note-default-view',
        userId: 'user-1',
        content: 'Default notes view entry',
        category: 'general',
        photos: [],
        timestamp: new Date('2026-03-07T09:00:00'),
        createdAt: new Date('2026-03-07T09:00:00'),
        updatedAt: new Date('2026-03-07T09:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Note' })).toBeInTheDocument();
    });
    expect(
      screen.getAllByText('Default notes view entry').length
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Add Task' })).not.toBeInTheDocument();
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
        recurrenceStartDate: new Date('2026-03-10T10:00:00'),
        completedAt: new Date('2026-03-11T10:00:00'),
        createdAt: new Date('2026-03-01T10:00:00'),
        updatedAt: new Date('2026-03-11T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Feed tomatoes').length).toBeGreaterThan(0)
    );
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Task' })).toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Every 2 weeks until Mar 31, 2026').length
    ).toBeGreaterThan(0);
    expect(screen.getByText('Recurring completion log')).toBeInTheDocument();
    expect(
      screen.getByText('1 of 2 scheduled completions logged')
    ).toBeInTheDocument();
    expect(screen.getByText('Use half-strength nutrients')).toBeInTheDocument();
    expect(screen.getByText('Tomato 1 (Roma)')).toBeInTheDocument();
    expect(screen.getByText('Greenhouse')).toBeInTheDocument();
    expect(screen.getAllByText(/Mar 11, 2026/).length).toBeGreaterThan(0);
    expect(mockLoadTasks).toHaveBeenCalled();
  });

  it('shows recurring log occurrences from explicit recurrence start date through end date', async () => {
    mockTasks = [
      {
        id: 'task-recur-1',
        userId: 'user-1',
        title: 'Mist w/water',
        description: 'lightly mist seedling tray',
        dueDate: new Date('2026-03-16T10:00:00'),
        priority: 'high',
        status: 'pending',
        plantId: 'plant-1',
        spaceId: 'space-1',
        recurrence: {
          type: 'daily',
          interval: 2,
          endDate: new Date('2026-03-20T10:00:00'),
        },
        recurrenceStartDate: new Date('2026-03-16T10:00:00'),
        createdAt: new Date('2026-03-16T10:00:00'),
        updatedAt: new Date('2026-03-16T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Mist w/water').length).toBeGreaterThan(0)
    );

    expect(screen.getByText('Recurring completion log')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 scheduled completions logged')).toBeInTheDocument();
    expect(screen.getByText('Occurrence 1')).toBeInTheDocument();
    expect(screen.getByText('Occurrence 2')).toBeInTheDocument();
    expect(screen.getByText('Occurrence 3')).toBeInTheDocument();
    expect(screen.getAllByText('Due Mar 16, 2026').length).toBeGreaterThan(0);
    expect(screen.getByText('Due Mar 18, 2026')).toBeInTheDocument();
    expect(screen.getByText('Due Mar 20, 2026')).toBeInTheDocument();
  });

  it('opens completion flow when clicking an actionable recurring occurrence card', async () => {
    mockTasks = [
      {
        id: 'task-recur-click',
        userId: 'user-1',
        title: 'Clickable recurring',
        dueDate: new Date('2026-03-16T10:00:00'),
        priority: 'medium',
        status: 'pending',
        recurrence: {
          type: 'daily',
          interval: 2,
          endDate: new Date('2026-03-20T10:00:00'),
        },
        recurrenceStartDate: new Date('2026-03-16T10:00:00'),
        createdAt: new Date('2026-03-16T10:00:00'),
        updatedAt: new Date('2026-03-16T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Clickable recurring').length).toBeGreaterThan(0)
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Mark occurrence 1 complete' })
    );

    expect(
      screen.getByRole('dialog', { name: 'Mock Task Completion Dialog' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Default category: recurringTask')
    ).toBeInTheDocument();
  });

  it('creates an occurrence task and opens completion flow with recurringTask default category when no task instance exists', async () => {
    mockTasks = [
      {
        id: 'task-recur-create-entry',
        userId: 'user-1',
        title: 'Create occurrence entry',
        dueDate: new Date('2026-03-16T10:00:00'),
        priority: 'medium',
        status: 'pending',
        recurrence: {
          type: 'daily',
          interval: 2,
          endDate: new Date('2026-03-20T10:00:00'),
        },
        recurrenceStartDate: new Date('2026-03-16T10:00:00'),
        createdAt: new Date('2026-03-16T10:00:00'),
        updatedAt: new Date('2026-03-16T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Create occurrence entry').length).toBeGreaterThan(0)
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Mark occurrence 2 complete' })
    );

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Create occurrence entry',
          status: 'pending',
          recurrenceOccurrence: 2,
          dueDate: new Date('2026-03-18T10:00:00'),
        })
      );
    });

    expect(
      screen.getByRole('dialog', { name: 'Mock Task Completion Dialog' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Default category: recurringTask')
    ).toBeInTheDocument();
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
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
    expect(screen.getByText('Does not repeat')).toBeInTheDocument();
    expect(screen.getByText('No plant attached')).toBeInTheDocument();
    expect(screen.getByText('No space attached')).toBeInTheDocument();
  });

  it('opens completion dialog from task list bubble and completes task', async () => {
    mockTasks = [
      {
        id: 'task-3',
        userId: 'user-1',
        title: 'Water seedlings',
        dueDate: new Date('2026-03-20T10:00:00'),
        priority: 'medium',
        status: 'pending',
        createdAt: new Date('2026-03-01T10:00:00'),
        updatedAt: new Date('2026-03-02T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Water seedlings').length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getByLabelText('Mark Water seedlings complete'));

    expect(
      screen.getByRole('dialog', { name: 'Mock Task Completion Dialog' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Complete without note' }));

    await waitFor(() => {
      expect(mockCompleteTask).toHaveBeenCalledWith('task-3');
    });
    expect(mockCreateNote).not.toHaveBeenCalled();
  });

  it('opens completion dialog from task details mark complete button', async () => {
    mockTasks = [
      {
        id: 'task-4',
        userId: 'user-1',
        title: 'Stake tomatoes',
        dueDate: new Date('2026-03-22T10:00:00'),
        priority: 'low',
        status: 'pending',
        createdAt: new Date('2026-03-01T10:00:00'),
        updatedAt: new Date('2026-03-02T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Stake tomatoes').length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

    expect(
      screen.getByRole('dialog', { name: 'Mock Task Completion Dialog' })
    ).toBeInTheDocument();
  });

  it('creates linked completion note with task plant and space context', async () => {
    mockTasks = [
      {
        id: 'task-5',
        userId: 'user-1',
        title: 'Transplant pepper',
        description: 'Move to final container',
        dueDate: new Date('2026-03-25T10:00:00'),
        priority: 'high',
        status: 'pending',
        plantId: 'plant-1',
        spaceId: 'space-1',
        createdAt: new Date('2026-03-01T10:00:00'),
        updatedAt: new Date('2026-03-02T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Transplant pepper').length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete with note' }));

    await waitFor(() => {
      expect(mockCompleteTask).toHaveBeenCalledWith('task-5');
      expect(mockCreateNote).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Linked completion note',
          category: 'milestone',
          plantId: 'plant-1',
          spaceId: 'space-1',
          timestamp: expect.any(Date),
        }),
        'user-1'
      );
    });
  });

  it('creates a new task from events tasks view', async () => {
    mockTasks = [
      {
        id: 'task-6',
        userId: 'user-1',
        title: 'Check soil moisture',
        dueDate: new Date('2026-03-15T10:00:00'),
        priority: 'medium',
        status: 'pending',
        createdAt: new Date('2026-03-01T10:00:00'),
        updatedAt: new Date('2026-03-02T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add Task' })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Task Form' }));

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New task from form',
          status: 'pending',
          userId: 'user-1',
        })
      );
    });
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('edits a task from task details actions', async () => {
    mockTasks = [
      {
        id: 'task-7',
        userId: 'user-1',
        title: 'Trim basil leaves',
        dueDate: new Date('2026-03-18T10:00:00'),
        priority: 'low',
        status: 'pending',
        createdAt: new Date('2026-03-01T10:00:00'),
        updatedAt: new Date('2026-03-02T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Edit task' })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Task Form' }));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        'task-7',
        expect.objectContaining({
          title: 'Updated Trim basil leaves',
          status: 'pending',
        })
      );
    });
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('deletes a task from task details actions', async () => {
    mockTasks = [
      {
        id: 'task-8',
        userId: 'user-1',
        title: 'Clean drip lines',
        dueDate: new Date('2026-03-19T10:00:00'),
        priority: 'medium',
        status: 'completed',
        completedAt: new Date('2026-03-20T10:00:00'),
        createdAt: new Date('2026-03-01T10:00:00'),
        updatedAt: new Date('2026-03-20T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete task' })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDeleteTask).toHaveBeenCalledWith('task-8');
    });
  });

  it('applies task deep-link filters and due-date grouping from url params', async () => {
    mockSearchParams = new URLSearchParams(
      'type=tasks&taskStatus=overdue&taskPriority=high&taskSpaceId=space-1&taskPlantId=plant-1&taskGroupBy=dueDate'
    );
    mockTasks = [
      {
        id: 'task-9',
        userId: 'user-1',
        title: 'Urgent overdue task',
        dueDate: new Date('2026-01-01T10:00:00'),
        priority: 'high',
        status: 'pending',
        spaceId: 'space-1',
        plantId: 'plant-1',
        createdAt: new Date('2025-12-01T10:00:00'),
        updatedAt: new Date('2025-12-02T10:00:00'),
      },
      {
        id: 'task-10',
        userId: 'user-1',
        title: 'Future high task',
        dueDate: new Date('2030-01-01T10:00:00'),
        priority: 'high',
        status: 'pending',
        spaceId: 'space-1',
        plantId: 'plant-1',
        createdAt: new Date('2025-12-01T10:00:00'),
        updatedAt: new Date('2025-12-02T10:00:00'),
      },
      {
        id: 'task-11',
        userId: 'user-1',
        title: 'Overdue but low priority',
        dueDate: new Date('2026-01-02T10:00:00'),
        priority: 'low',
        status: 'pending',
        spaceId: 'space-1',
        plantId: 'plant-1',
        createdAt: new Date('2025-12-01T10:00:00'),
        updatedAt: new Date('2025-12-02T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText('Urgent overdue task').length).toBeGreaterThan(
        0
      )
    );

    expect(screen.queryByText('Future high task')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Overdue but low priority')
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
  });

  it('shows overdue tasks plus high-priority tasks due in the next 24 hours for issues filter', async () => {
    mockSearchParams = new URLSearchParams('type=tasks&taskStatus=issues');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueDate = new Date(today);
    overdueDate.setDate(overdueDate.getDate() - 1);

    const dueSoonHighDate = new Date(today);
    dueSoonHighDate.setHours(11, 0, 0, 0);

    const futureHighDate = new Date(today);
    futureHighDate.setDate(futureHighDate.getDate() + 3);
    futureHighDate.setHours(11, 0, 0, 0);

    mockTasks = [
      {
        id: 'task-issues-overdue',
        userId: 'user-1',
        title: 'Overdue low task',
        dueDate: overdueDate,
        priority: 'low',
        status: 'pending',
        createdAt: overdueDate,
        updatedAt: overdueDate,
      },
      {
        id: 'task-issues-high-soon',
        userId: 'user-1',
        title: 'High priority due soon',
        dueDate: dueSoonHighDate,
        priority: 'high',
        status: 'pending',
        createdAt: dueSoonHighDate,
        updatedAt: dueSoonHighDate,
      },
      {
        id: 'task-issues-high-future',
        userId: 'user-1',
        title: 'High priority future task',
        dueDate: futureHighDate,
        priority: 'high',
        status: 'pending',
        createdAt: futureHighDate,
        updatedAt: futureHighDate,
      },
    ];

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Overdue low task').length).toBeGreaterThan(0);
    });

    expect(
      screen.getAllByText('High priority due soon').length
    ).toBeGreaterThan(0);
    expect(screen.queryByText('High priority future task')).not.toBeInTheDocument();
  });

  it('shows task context/status controls and clears task filter params', async () => {
    mockSearchParams = new URLSearchParams(
      'type=tasks&taskContext=plants&taskStatus=completed&taskPriority=medium&taskGroupBy=dueDate'
    );
    mockTasks = [
      {
        id: 'task-12',
        userId: 'user-1',
        title: 'Completed prune',
        dueDate: new Date('2026-03-01T10:00:00'),
        priority: 'medium',
        status: 'completed',
        createdAt: new Date('2026-02-01T10:00:00'),
        updatedAt: new Date('2026-03-01T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /All/i })).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        /Use Filters for smart status views: Issues shows overdue tasks plus high-priority tasks due in the next 24 hours, and Due Soon shows pending tasks due in the next 24 hours\./i
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Plants/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Spaces/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All statuses' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pending statuses' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Completed statuses' })
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
    expect(screen.queryByText('Added task')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('button', { name: 'Issues' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Due Soon' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overdue' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search tasks...'), {
      target: { value: 'prune' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalled();
    });

    const params = mockSetSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(params.get('type')).toBe('tasks');
    expect(params.get('taskContext')).toBeNull();
    expect(params.get('taskScope')).toBeNull();
    expect(params.get('taskStatus')).toBeNull();
    expect(params.get('taskPriority')).toBeNull();
    expect(params.get('taskSpaceId')).toBeNull();
    expect(params.get('taskPlantId')).toBeNull();
    expect(params.get('taskGroupBy')).toBeNull();
  });

  it('shows only unlinked tasks when taskScope=unlinked in all context', async () => {
    mockSearchParams = new URLSearchParams(
      'type=tasks&taskContext=all&taskScope=unlinked'
    );
    mockTasks = [
      {
        id: 'task-unlinked',
        userId: 'user-1',
        title: 'General admin',
        dueDate: new Date('2026-03-25T10:00:00'),
        priority: 'low',
        status: 'pending',
        createdAt: new Date('2026-03-01T10:00:00'),
        updatedAt: new Date('2026-03-01T10:00:00'),
      },
      {
        id: 'task-linked',
        userId: 'user-1',
        title: 'Linked plant task',
        dueDate: new Date('2026-03-25T10:00:00'),
        priority: 'medium',
        status: 'pending',
        plantId: 'plant-1',
        spaceId: 'space-1',
        createdAt: new Date('2026-03-01T10:00:00'),
        updatedAt: new Date('2026-03-01T10:00:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('General admin').length).toBeGreaterThan(0);
    });

    expect(screen.queryByText('Linked plant task')).not.toBeInTheDocument();
    expect(screen.getByText('Unlinked')).toBeInTheDocument();
  });

  it('shows notes helper copy and first-note empty state guidance', async () => {
    mockSearchParams = new URLSearchParams('type=notes');
    mockNotes = [];

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByText('No notes found')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /Use notes for observations, issues, milestones, photo updates/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Start documenting observations, issues, milestones, or photo progress here/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create First Note' })
    ).toBeInTheDocument();
  });

  it('shows notes filter empty-state guidance and clears note params', async () => {
    mockSearchParams = new URLSearchParams('type=notes&category=issue');
    mockNotes = [
      {
        id: 'note-filter-1',
        userId: 'user-1',
        content: 'General greenhouse cleanup',
        category: 'general',
        photos: [],
        timestamp: new Date('2026-03-05T09:00:00'),
        createdAt: new Date('2026-03-05T09:00:00'),
        updatedAt: new Date('2026-03-05T09:05:00'),
      },
    ];

    render(<EventsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Try adjusting your search or filters to find what you're looking for/i
        )
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: 'Create First Note' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalled();
    });

    const params = mockSetSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(params.get('type')).toBe('notes');
    expect(params.get('category')).toBeNull();
    expect(params.get('spaceId')).toBeNull();
    expect(params.get('plantId')).toBeNull();
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
    expect(screen.queryByText('�')).not.toBeInTheDocument();
    expect(mockLoadNotes).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        spaceId: 'space-1',
      })
    );
    const noteLoadFilters = mockLoadNotes.mock.calls.at(-1)?.[1] as Record<
      string,
      unknown
    >;
    expect(noteLoadFilters).not.toHaveProperty('category');
  });
});
