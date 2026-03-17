import { BaseService, type ServiceResult } from './baseService';
import type { Task, RecurrenceSettings } from '../types';
import { addDays, addWeeks, addMonths, isAfter, isBefore, startOfDay } from 'date-fns';

export class TaskService extends BaseService<Task> {
  constructor() {
    super('tasks');
  }

  /**
   * Get all tasks for a user
   */
  async getUserTasks(userId: string): Promise<ServiceResult<Task[]>> {
    const result = await this.list({
      where: [{ field: 'userId', operator: '==', value: userId }],
    });

    if (result.data) {
      result.data.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }

    return result;
  }

  /**
   * Get tasks for a specific space
   */
  async getSpaceTasks(spaceId: string, userId: string): Promise<ServiceResult<Task[]>> {
    const result = await this.list({
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'spaceId', operator: '==', value: spaceId }
      ],
    });

    if (result.data) {
      result.data.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }

    return result;
  }

  /**
   * Get tasks for a specific plant
   */
  async getPlantTasks(plantId: string, userId: string): Promise<ServiceResult<Task[]>> {
    const result = await this.list({
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'plantId', operator: '==', value: plantId }
      ],
    });

    if (result.data) {
      result.data.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }

    return result;
  }

  /**
   * Get overdue tasks for a user
   */
  async getOverdueTasks(userId: string): Promise<ServiceResult<Task[]>> {
    const today = startOfDay(new Date());
    return this.list({
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'status', operator: '==', value: 'pending' },
        { field: 'dueDate', operator: '<', value: today }
      ],
      orderBy: [{ field: 'dueDate', direction: 'asc' }]
    });
  }

  /**
   * Get upcoming tasks for a user (next 7 days)
   */
  async getUpcomingTasks(userId: string, days: number = 7): Promise<ServiceResult<Task[]>> {
    const today = startOfDay(new Date());
    const futureDate = addDays(today, days);
    
    return this.list({
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'status', operator: '==', value: 'pending' },
        { field: 'dueDate', operator: '>=', value: today },
        { field: 'dueDate', operator: '<=', value: futureDate }
      ],
      orderBy: [{ field: 'dueDate', direction: 'asc' }]
    });
  }

  /**
   * Create a new task
   */
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<Task>> {
    return this.create(taskData);
  }

  /**
   * Update a task
   */
  async updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ServiceResult<Task>> {
    return this.update(id, updates);
  }

  /**
   * Complete a task
   */
  async completeTask(id: string): Promise<ServiceResult<Task>> {
    const completedAt = new Date();
    const result = await this.update(id, { 
      status: 'completed',
      completedAt 
    });

    if (result.data && result.data.recurrence) {
      // Create next recurring task
      await this.createNextRecurringTask(result.data);
    }

    return result;
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<ServiceResult<void>> {
    return this.delete(id);
  }

  /**
   * Create the next instance of a recurring task
   */
  private async createNextRecurringTask(completedTask: Task): Promise<ServiceResult<Task> | null> {
    if (!completedTask.recurrence) {
      return null;
    }

    const { recurrence } = completedTask;
    const nextDueDate = this.calculateNextDueDate(completedTask.dueDate, recurrence);

    // Check if we should create the next task (not past end date)
    if (recurrence.endDate && isAfter(nextDueDate, recurrence.endDate)) {
      return null;
    }

    // Create the next task
    const nextTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: completedTask.userId,
      plantId: completedTask.plantId,
      spaceId: completedTask.spaceId,
      title: completedTask.title,
      description: completedTask.description,
      dueDate: nextDueDate,
      priority: completedTask.priority,
      status: 'pending',
      recurrence: completedTask.recurrence
    };

    return this.createTask(nextTaskData);
  }

  /**
   * Calculate the next due date based on recurrence settings
   */
  private calculateNextDueDate(currentDueDate: Date, recurrence: RecurrenceSettings): Date {
    const { type, interval } = recurrence;

    switch (type) {
      case 'daily':
        return addDays(currentDueDate, interval);
      case 'weekly':
        return addWeeks(currentDueDate, interval);
      case 'monthly':
        return addMonths(currentDueDate, interval);
      default:
        return addDays(currentDueDate, 1);
    }
  }

  /**
   * Subscribe to user tasks with real-time updates
   */
  subscribeToUserTasks(
    userId: string,
    callback: (result: ServiceResult<Task[]>) => void
  ): () => void {
    return this.subscribe(callback, {
      where: [{ field: 'userId', operator: '==', value: userId }],
      orderBy: [{ field: 'dueDate', direction: 'asc' }]
    });
  }

  /**
   * Subscribe to space tasks with real-time updates
   */
  subscribeToSpaceTasks(
    spaceId: string,
    userId: string,
    callback: (result: ServiceResult<Task[]>) => void
  ): () => void {
    return this.subscribe(callback, {
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'spaceId', operator: '==', value: spaceId }
      ],
      orderBy: [{ field: 'dueDate', direction: 'asc' }]
    });
  }

  /**
   * Subscribe to plant tasks with real-time updates
   */
  subscribeToPlantTasks(
    plantId: string,
    userId: string,
    callback: (result: ServiceResult<Task[]>) => void
  ): () => void {
    return this.subscribe(callback, {
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'plantId', operator: '==', value: plantId }
      ],
      orderBy: [{ field: 'dueDate', direction: 'asc' }]
    });
  }
}

export const taskService = new TaskService();
