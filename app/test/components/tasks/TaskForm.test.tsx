import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { TaskForm } from '../../../components/tasks/TaskForm';
import type { Task } from '../../../lib/types';

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { uid: 'user-1' },
  }),
}));

describe('TaskForm', () => {
  const mockOnCancel = vi.fn();
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows due date for one-off tasks and swaps to start/end controls for recurring tasks', () => {
    render(
      <TaskForm
        spaces={[]}
        plants={[]}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Due Date *')).toBeInTheDocument();
    expect(screen.queryByText('Start Date *')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Recurring Task'));

    expect(screen.queryByText('Due Date *')).not.toBeInTheDocument();
    expect(screen.getByText('Start Date *')).toBeInTheDocument();
    expect(screen.getByText('End Date (Optional)')).toBeInTheDocument();
  });

  it('renders recurring controls before due date to avoid disappearing field confusion', () => {
    render(
      <TaskForm
        spaces={[]}
        plants={[]}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const recurrenceControl = screen.getByLabelText('Recurring Task');
    const dueDateLabel = screen.getByText('Due Date *');
    const relation = recurrenceControl.compareDocumentPosition(dueDateLabel);

    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('submits one-off tasks with due date and no recurrence start date', async () => {
    render(
      <TaskForm
        spaces={[]}
        plants={[]}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { value: 'One-off task' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1));
    const submittedTask = mockOnSubmit.mock.calls[0]?.[0] as Omit<
      Task,
      'id' | 'createdAt' | 'updatedAt'
    >;

    expect(submittedTask.dueDate).toBeInstanceOf(Date);
    expect(submittedTask.recurrence).toBeUndefined();
    expect(submittedTask.recurrenceStartDate).toBeUndefined();
  });

  it('submits recurring tasks anchored by recurrence start date', async () => {
    render(
      <TaskForm
        spaces={[]}
        plants={[]}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByLabelText('Recurring Task'));
    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { value: 'Recurring task' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1));
    const submittedTask = mockOnSubmit.mock.calls[0]?.[0] as Omit<
      Task,
      'id' | 'createdAt' | 'updatedAt'
    >;

    expect(submittedTask.recurrenceStartDate).toBeInstanceOf(Date);
    expect(submittedTask.dueDate.getTime()).toBe(
      submittedTask.recurrenceStartDate!.getTime()
    );
    expect(submittedTask.recurrence).toEqual(
      expect.objectContaining({
        type: 'weekly',
        interval: 1,
      })
    );
    expect(submittedTask.recurrence).not.toHaveProperty('endDate');
  });

  it('requires start date when editing recurring tasks without recurrenceStartDate', async () => {
    const recurringTaskMissingStart: Task = {
      id: 'task-1',
      userId: 'user-1',
      title: 'Recurring legacy task',
      dueDate: new Date('2026-03-20T10:00:00'),
      priority: 'high',
      status: 'pending',
      recurrence: {
        type: 'daily',
        interval: 2,
        endDate: new Date('2026-03-30T10:00:00'),
      },
      createdAt: new Date('2026-03-16T10:00:00'),
      updatedAt: new Date('2026-03-16T10:00:00'),
    };

    render(
      <TaskForm
        task={recurringTaskMissingStart}
        spaces={[]}
        plants={[]}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update Task' }));

    await waitFor(() => {
      expect(screen.getByText('Start date is required')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
