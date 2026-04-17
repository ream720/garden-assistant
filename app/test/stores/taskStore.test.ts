import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';
import { taskService } from '../../lib/services/taskService';
import type { Task } from '../../lib/types';

vi.mock('../../lib/services/taskService', () => ({
  taskService: {
    completeTask: vi.fn(),
    getUserTasks: vi.fn(),
  },
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

const recurringTask: Task = {
  id: 'task-1',
  userId: 'user-1',
  title: 'Weekly feed',
  dueDate: new Date('2026-04-16T10:00:00'),
  priority: 'medium',
  status: 'pending',
  recurrence: {
    type: 'weekly',
    interval: 1,
  },
  recurrenceSeriesId: 'series-1',
  recurrenceOccurrence: 1,
  recurrenceStartDate: new Date('2026-04-16T10:00:00'),
  createdAt: new Date('2026-04-16T09:00:00'),
  updatedAt: new Date('2026-04-16T09:00:00'),
};

describe('Task Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useTaskStore.setState({
      tasks: [],
      selectedTask: null,
      loading: false,
      error: null,
      filterStatus: 'all',
      filterPriority: 'all',
      filterSpaceId: null,
      filterPlantId: null,
    });

    vi.mocked(useAuthStore.getState).mockReturnValue({
      user: { uid: 'user-1' },
    } as any);
  });

  it('refreshes tasks after recurring completion so the next occurrence appears immediately', async () => {
    const completedTask: Task = {
      ...recurringTask,
      status: 'completed',
      completedAt: new Date('2026-04-16T11:00:00'),
      updatedAt: new Date('2026-04-16T11:00:00'),
    };

    const nextOccurrence: Task = {
      ...recurringTask,
      id: 'task-2',
      dueDate: new Date('2026-04-23T10:00:00'),
      recurrenceOccurrence: 2,
      status: 'pending',
      createdAt: new Date('2026-04-16T11:00:01'),
      updatedAt: new Date('2026-04-16T11:00:01'),
    };

    useTaskStore.setState({
      tasks: [recurringTask],
      selectedTask: recurringTask,
    });

    vi.mocked(taskService.completeTask).mockResolvedValue({
      data: completedTask,
    });
    vi.mocked(taskService.getUserTasks).mockResolvedValue({
      data: [completedTask, nextOccurrence],
    });

    await useTaskStore.getState().completeTask('task-1');

    expect(taskService.completeTask).toHaveBeenCalledWith('task-1', 'user-1');
    expect(taskService.getUserTasks).toHaveBeenCalledWith('user-1');

    const state = useTaskStore.getState();
    expect(state.tasks).toEqual([completedTask, nextOccurrence]);
    expect(state.selectedTask?.id).toBe('task-1');
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('falls back to local state update when completion refresh fails', async () => {
    const completedTask: Task = {
      ...recurringTask,
      status: 'completed',
      completedAt: new Date('2026-04-16T11:00:00'),
      updatedAt: new Date('2026-04-16T11:00:00'),
    };

    useTaskStore.setState({
      tasks: [recurringTask],
      selectedTask: recurringTask,
    });

    vi.mocked(taskService.completeTask).mockResolvedValue({
      data: completedTask,
    });
    vi.mocked(taskService.getUserTasks).mockResolvedValue({
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'refresh failed',
      },
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await useTaskStore.getState().completeTask('task-1');

    const state = useTaskStore.getState();
    expect(state.tasks).toEqual([completedTask]);
    expect(state.selectedTask?.status).toBe('completed');
    expect(state.loading).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      'Task completion refresh failed; using local fallback state:',
      'refresh failed'
    );

    warnSpy.mockRestore();
  });
});
