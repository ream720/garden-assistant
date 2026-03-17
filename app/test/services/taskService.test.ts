import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskService } from '../../lib/services/taskService';
import type { Task, RecurrenceSettings } from '../../lib/types';
import { addDays, addWeeks, addMonths, startOfDay } from 'date-fns';

// Mock Firebase
vi.mock('../../lib/firebase/config', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() }))
  }
}));

describe('TaskService', () => {
  const mockUserId = 'user123';
  const mockTaskId = 'task123';
  const mockSpaceId = 'space123';
  const mockPlantId = 'plant123';

  const mockTask: Task = {
    id: mockTaskId,
    userId: mockUserId,
    title: 'Test Task',
    description: 'Test Description',
    dueDate: new Date('2024-01-15'),
    priority: 'medium',
    status: 'pending',
    spaceId: mockSpaceId,
    plantId: mockPlantId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserTasks', () => {
    it('should call list with correct filters', async () => {
      const listSpy = vi.spyOn(taskService, 'list').mockResolvedValue({
        data: [mockTask]
      });

      await taskService.getUserTasks(mockUserId);

      expect(listSpy).toHaveBeenCalledWith({
        where: [{ field: 'userId', operator: '==', value: mockUserId }],
      });
    });
  });

  describe('getSpaceTasks', () => {
    it('should call list with space and user filters', async () => {
      const listSpy = vi.spyOn(taskService, 'list').mockResolvedValue({
        data: [mockTask]
      });

      await taskService.getSpaceTasks(mockSpaceId, mockUserId);

      expect(listSpy).toHaveBeenCalledWith({
        where: [
          { field: 'userId', operator: '==', value: mockUserId },
          { field: 'spaceId', operator: '==', value: mockSpaceId }
        ],
      });
    });
  });

  describe('getPlantTasks', () => {
    it('should call list with plant and user filters', async () => {
      const listSpy = vi.spyOn(taskService, 'list').mockResolvedValue({
        data: [mockTask]
      });

      await taskService.getPlantTasks(mockPlantId, mockUserId);

      expect(listSpy).toHaveBeenCalledWith({
        where: [
          { field: 'userId', operator: '==', value: mockUserId },
          { field: 'plantId', operator: '==', value: mockPlantId }
        ],
      });
    });
  });

  describe('createTask', () => {
    it('should call create with task data', async () => {
      const createSpy = vi.spyOn(taskService, 'create').mockResolvedValue({
        data: mockTask
      });

      const taskData = {
        userId: mockUserId,
        title: 'New Task',
        dueDate: new Date(),
        priority: 'high' as const,
        status: 'pending' as const
      };

      await taskService.createTask(taskData);

      expect(createSpy).toHaveBeenCalledWith(taskData);
    });
  });

  describe('completeTask', () => {
    it('should update task status to completed with a completedAt date', async () => {
      const updateSpy = vi.spyOn(taskService, 'update').mockResolvedValue({
        data: { ...mockTask, status: 'completed', completedAt: new Date() }
      });

      await taskService.completeTask(mockTaskId);

      expect(updateSpy).toHaveBeenCalledWith(mockTaskId, expect.objectContaining({
        status: 'completed',
        completedAt: expect.any(Date)
      }));
    });

    it('should set completedAt to approximately the current time', async () => {
      const before = new Date();
      const updateSpy = vi.spyOn(taskService, 'update').mockResolvedValue({
        data: { ...mockTask, status: 'completed', completedAt: new Date() }
      });

      await taskService.completeTask(mockTaskId);
      const after = new Date();

      const calledWith = updateSpy.mock.calls[0][1] as { completedAt: Date };
      expect(calledWith.completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(calledWith.completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should create next recurring task when task has recurrence', async () => {
      const recurringTask: Task = {
        ...mockTask,
        status: 'completed',
        completedAt: new Date(),
        recurrence: {
          type: 'daily',
          interval: 1,
        }
      };

      vi.spyOn(taskService, 'update').mockResolvedValue({
        data: recurringTask
      });

      const createSpy = vi.spyOn(taskService, 'create').mockResolvedValue({
        data: { ...recurringTask, id: 'new-task-id', status: 'pending' }
      });

      await taskService.completeTask(mockTaskId);

      // Should have called create for the next recurring task
      expect(createSpy).toHaveBeenCalled();
      const createArgs = createSpy.mock.calls[0][0] as Partial<Task>;
      expect(createArgs.status).toBe('pending');
      expect(createArgs.dueDate).toBeInstanceOf(Date);
    });

    it('should NOT create next recurring task when task has no recurrence', async () => {
      vi.spyOn(taskService, 'update').mockResolvedValue({
        data: { ...mockTask, status: 'completed', completedAt: new Date() }
      });

      const createSpy = vi.spyOn(taskService, 'create').mockResolvedValue({
        data: mockTask
      });

      await taskService.completeTask(mockTaskId);

      // create should NOT be called for non-recurring tasks
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should not create next recurring task when next due date is past endDate', async () => {
      const recurringTask: Task = {
        ...mockTask,
        dueDate: new Date('2024-01-14'),
        status: 'completed',
        completedAt: new Date(),
        recurrence: {
          type: 'daily',
          interval: 1,
          endDate: new Date('2024-01-14'), // endDate is before the next due date (Jan 15)
        }
      };

      vi.spyOn(taskService, 'update').mockResolvedValue({
        data: recurringTask
      });

      const createSpy = vi.spyOn(taskService, 'create').mockResolvedValue({
        data: { ...recurringTask, id: 'new-task-id', status: 'pending' }
      });

      await taskService.completeTask(mockTaskId);

      // Should NOT create next task because next due date exceeds endDate
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should calculate daily recurrence due date correctly', async () => {
      const baseDueDate = new Date('2024-03-01');
      const recurringTask: Task = {
        ...mockTask,
        dueDate: baseDueDate,
        status: 'completed',
        completedAt: new Date(),
        recurrence: {
          type: 'daily',
          interval: 3,
        }
      };

      vi.spyOn(taskService, 'update').mockResolvedValue({
        data: recurringTask
      });

      const createSpy = vi.spyOn(taskService, 'create').mockResolvedValue({
        data: { ...recurringTask, id: 'new-task-id', status: 'pending' }
      });

      await taskService.completeTask(mockTaskId);

      const createArgs = createSpy.mock.calls[0][0] as Partial<Task>;
      const expectedNextDate = addDays(baseDueDate, 3);
      expect(createArgs.dueDate!.getTime()).toBe(expectedNextDate.getTime());
    });

    it('should calculate weekly recurrence due date correctly', async () => {
      const baseDueDate = new Date('2024-03-01');
      const recurringTask: Task = {
        ...mockTask,
        dueDate: baseDueDate,
        status: 'completed',
        completedAt: new Date(),
        recurrence: {
          type: 'weekly',
          interval: 2,
        }
      };

      vi.spyOn(taskService, 'update').mockResolvedValue({
        data: recurringTask
      });

      const createSpy = vi.spyOn(taskService, 'create').mockResolvedValue({
        data: { ...recurringTask, id: 'new-task-id', status: 'pending' }
      });

      await taskService.completeTask(mockTaskId);

      const createArgs = createSpy.mock.calls[0][0] as Partial<Task>;
      const expectedNextDate = addWeeks(baseDueDate, 2);
      expect(createArgs.dueDate!.getTime()).toBe(expectedNextDate.getTime());
    });

    it('should calculate monthly recurrence due date correctly', async () => {
      const baseDueDate = new Date('2024-01-31');
      const recurringTask: Task = {
        ...mockTask,
        dueDate: baseDueDate,
        status: 'completed',
        completedAt: new Date(),
        recurrence: {
          type: 'monthly',
          interval: 1,
        }
      };

      vi.spyOn(taskService, 'update').mockResolvedValue({
        data: recurringTask
      });

      const createSpy = vi.spyOn(taskService, 'create').mockResolvedValue({
        data: { ...recurringTask, id: 'new-task-id', status: 'pending' }
      });

      await taskService.completeTask(mockTaskId);

      const createArgs = createSpy.mock.calls[0][0] as Partial<Task>;
      const expectedNextDate = addMonths(baseDueDate, 1);
      expect(createArgs.dueDate!.getTime()).toBe(expectedNextDate.getTime());
    });

    it('should preserve all task fields when creating recurring task', async () => {
      const recurringTask: Task = {
        ...mockTask,
        dueDate: new Date('2024-03-01'),
        status: 'completed',
        completedAt: new Date(),
        recurrence: {
          type: 'weekly',
          interval: 1,
        }
      };

      vi.spyOn(taskService, 'update').mockResolvedValue({
        data: recurringTask
      });

      const createSpy = vi.spyOn(taskService, 'create').mockResolvedValue({
        data: { ...recurringTask, id: 'new-task-id', status: 'pending' }
      });

      await taskService.completeTask(mockTaskId);

      const createArgs = createSpy.mock.calls[0][0] as Partial<Task>;
      expect(createArgs.userId).toBe(mockUserId);
      expect(createArgs.title).toBe('Test Task');
      expect(createArgs.description).toBe('Test Description');
      expect(createArgs.priority).toBe('medium');
      expect(createArgs.spaceId).toBe(mockSpaceId);
      expect(createArgs.plantId).toBe(mockPlantId);
      expect(createArgs.recurrence).toEqual(recurringTask.recurrence);
      expect(createArgs.status).toBe('pending');
    });
  });

  describe('getOverdueTasks', () => {
    it('should filter for pending tasks with dueDate before today', async () => {
      const listSpy = vi.spyOn(taskService, 'list').mockResolvedValue({
        data: []
      });

      await taskService.getOverdueTasks(mockUserId);

      expect(listSpy).toHaveBeenCalledWith({
        where: [
          { field: 'userId', operator: '==', value: mockUserId },
          { field: 'status', operator: '==', value: 'pending' },
          { field: 'dueDate', operator: '<', value: expect.any(Date) }
        ],
        orderBy: [{ field: 'dueDate', direction: 'asc' }]
      });
    });

    it('should use startOfDay for the date comparison', async () => {
      const listSpy = vi.spyOn(taskService, 'list').mockResolvedValue({
        data: []
      });

      const before = startOfDay(new Date());
      await taskService.getOverdueTasks(mockUserId);
      const after = startOfDay(new Date());

      const [firstCall] = listSpy.mock.calls;
      expect(firstCall).toBeDefined();
      if (!firstCall) {
        throw new Error('Expected taskService.list to be called');
      }

      const filterWhere = firstCall[0]?.where;
      expect(filterWhere).toBeDefined();
      if (!filterWhere) {
        throw new Error('Expected where filters to be provided');
      }

      const dueDateFilter = filterWhere.find((f: any) => f.field === 'dueDate');
      const usedDate = dueDateFilter!.value as Date;

      // The date used should be startOfDay (midnight)
      expect(usedDate.getHours()).toBe(0);
      expect(usedDate.getMinutes()).toBe(0);
      expect(usedDate.getSeconds()).toBe(0);
      expect(usedDate.getMilliseconds()).toBe(0);
      // Should be between before and after (effectively the same instant)
      expect(usedDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(usedDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getUpcomingTasks', () => {
    it('should filter for pending tasks due within the next 7 days by default', async () => {
      const listSpy = vi.spyOn(taskService, 'list').mockResolvedValue({
        data: []
      });

      await taskService.getUpcomingTasks(mockUserId);

      expect(listSpy).toHaveBeenCalledWith({
        where: [
          { field: 'userId', operator: '==', value: mockUserId },
          { field: 'status', operator: '==', value: 'pending' },
          { field: 'dueDate', operator: '>=', value: expect.any(Date) },
          { field: 'dueDate', operator: '<=', value: expect.any(Date) }
        ],
        orderBy: [{ field: 'dueDate', direction: 'asc' }]
      });
    });

    it('should use a 7-day range from startOfDay by default', async () => {
      const listSpy = vi.spyOn(taskService, 'list').mockResolvedValue({
        data: []
      });

      const expectedStart = startOfDay(new Date());
      const expectedEnd = addDays(expectedStart, 7);

      await taskService.getUpcomingTasks(mockUserId);

      const [firstCall] = listSpy.mock.calls;
      expect(firstCall).toBeDefined();
      if (!firstCall) {
        throw new Error('Expected taskService.list to be called');
      }

      const filterWhere = firstCall[0]?.where;
      expect(filterWhere).toBeDefined();
      if (!filterWhere) {
        throw new Error('Expected where filters to be provided');
      }

      const startFilter = filterWhere.find((f: any) => f.field === 'dueDate' && f.operator === '>=');
      const endFilter = filterWhere.find((f: any) => f.field === 'dueDate' && f.operator === '<=');

      // Start should be start of today
      expect((startFilter!.value as Date).getHours()).toBe(0);
      // End should be 7 days from start
      const usedEnd = endFilter!.value as Date;
      expect(usedEnd.getTime()).toBe(expectedEnd.getTime());
    });

    it('should accept a custom number of days', async () => {
      const listSpy = vi.spyOn(taskService, 'list').mockResolvedValue({
        data: []
      });

      const customDays = 14;
      await taskService.getUpcomingTasks(mockUserId, customDays);

      const [firstCall] = listSpy.mock.calls;
      expect(firstCall).toBeDefined();
      if (!firstCall) {
        throw new Error('Expected taskService.list to be called');
      }

      const filterWhere = firstCall[0]?.where;
      expect(filterWhere).toBeDefined();
      if (!filterWhere) {
        throw new Error('Expected where filters to be provided');
      }

      const startFilter = filterWhere.find((f: any) => f.field === 'dueDate' && f.operator === '>=');
      const endFilter = filterWhere.find((f: any) => f.field === 'dueDate' && f.operator === '<=');

      const startDate = startFilter!.value as Date;
      const endDate = endFilter!.value as Date;

      const expectedEnd = addDays(startOfDay(new Date()), customDays);
      expect(endDate.getTime()).toBe(expectedEnd.getTime());
    });
  });

  describe('deleteTask', () => {
    it('should call delete with the task id', async () => {
      const deleteSpy = vi.spyOn(taskService, 'delete').mockResolvedValue({});

      await taskService.deleteTask(mockTaskId);

      expect(deleteSpy).toHaveBeenCalledWith(mockTaskId);
    });
  });
});
