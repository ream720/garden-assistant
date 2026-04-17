import { addDays, addMonths, addWeeks, isBefore, isSameDay, startOfDay } from 'date-fns';

import type { RecurrenceSettings, Task } from '../types';

const MAX_RECURRING_CHECKLIST_ITEMS = 180;
const OPEN_ENDED_RECURRING_CHECKLIST_PREVIEW_ITEMS = 12;

const toDayKey = (date: Date) => startOfDay(date).getTime();

const getRecurringFallbackSeriesKey = (task: Task): string | null => {
  if (!task.recurrence) {
    return null;
  }

  return [
    task.userId,
    task.title.trim().toLowerCase(),
    task.plantId ?? 'no-plant',
    task.spaceId ?? 'no-space',
    task.recurrence.type,
    task.recurrence.interval,
    task.recurrence.endDate ? toDayKey(task.recurrence.endDate).toString() : 'no-end-date',
  ].join('|');
};

const isInSameRecurringSeries = (baseTask: Task, candidateTask: Task): boolean => {
  if (!baseTask.recurrence || !candidateTask.recurrence) {
    return false;
  }

  const baseSeriesId = baseTask.recurrenceSeriesId ?? baseTask.id;
  const candidateSeriesId = candidateTask.recurrenceSeriesId ?? candidateTask.id;
  if (baseSeriesId === candidateSeriesId) {
    return true;
  }

  const baseFallbackKey = getRecurringFallbackSeriesKey(baseTask);
  const candidateFallbackKey = getRecurringFallbackSeriesKey(candidateTask);
  return (
    baseFallbackKey !== null &&
    candidateFallbackKey !== null &&
    baseFallbackKey === candidateFallbackKey
  );
};

const classifyOccurrenceStatus = (
  dueDate: Date,
  matchingTask: Task | undefined,
  referenceDate: Date
): RecurringTaskChecklistItem['status'] => {
  if (matchingTask?.status === 'completed') {
    return 'completed';
  }

  const today = startOfDay(referenceDate);
  if (isBefore(dueDate, today)) {
    return 'overdue';
  }

  if (isSameDay(dueDate, today)) {
    return 'pending';
  }

  return 'upcoming';
};

export const incrementRecurrenceDate = (
  currentDueDate: Date,
  recurrence: RecurrenceSettings
): Date => {
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
};

export const isTaskOverdue = (task: Task, referenceDate: Date = new Date()) => {
  if (task.status !== 'pending') {
    return false;
  }

  return isBefore(task.dueDate, startOfDay(referenceDate));
};

export const isTaskDueSoon = (
  task: Task,
  referenceDate: Date = new Date(),
  windowInDays: number = 1
) => {
  if (task.status !== 'pending') {
    return false;
  }

  const start = startOfDay(referenceDate);
  const end = addDays(start, windowInDays);
  return task.dueDate >= start && task.dueDate <= end;
};

export const isTaskNeedsAttention = (task: Task, referenceDate: Date = new Date()) => {
  if (isTaskOverdue(task, referenceDate)) {
    return true;
  }

  return task.priority === 'high' && isTaskDueSoon(task, referenceDate, 1);
};

export interface RecurringTaskChecklistItem {
  dueDate: Date;
  occurrenceNumber: number;
  taskId?: string;
  completedAt?: Date;
  status: 'completed' | 'pending' | 'overdue' | 'upcoming';
  isCurrent: boolean;
}

export interface RecurringTaskChecklist {
  items: RecurringTaskChecklistItem[];
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  upcomingCount: number;
}

export const buildRecurringTaskChecklist = (
  task: Task | null,
  allTasks: Task[],
  referenceDate: Date = new Date()
): RecurringTaskChecklist | null => {
  if (!task?.recurrence) {
    return null;
  }

  const seriesTasks = allTasks
    .filter((candidateTask) => isInSameRecurringSeries(task, candidateTask))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  if (!seriesTasks.some((seriesTask) => seriesTask.id === task.id)) {
    seriesTasks.push(task);
    seriesTasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  if (seriesTasks.length === 0) {
    return null;
  }

  const tasksByDay = new Map<number, Task[]>();
  seriesTasks.forEach((seriesTask) => {
    const dayKey = toDayKey(seriesTask.dueDate);
    const bucket = tasksByDay.get(dayKey) ?? [];
    bucket.push(seriesTask);
    bucket.sort((leftTask, rightTask) => {
      if (leftTask.id === task.id) {
        return -1;
      }
      if (rightTask.id === task.id) {
        return 1;
      }
      if (leftTask.status === 'completed' && rightTask.status !== 'completed') {
        return -1;
      }
      if (rightTask.status === 'completed' && leftTask.status !== 'completed') {
        return 1;
      }

      return rightTask.updatedAt.getTime() - leftTask.updatedAt.getTime();
    });
    tasksByDay.set(dayKey, bucket);
  });

  let items: RecurringTaskChecklistItem[] = [];
  if (task.recurrence.endDate) {
    const seriesStartDate = task.recurrenceStartDate;
    if (!seriesStartDate) {
      return null;
    }
    const endDayKey = toDayKey(task.recurrence.endDate);

    let occurrenceDate = seriesStartDate;
    let occurrenceNumber = 1;

    while (
      toDayKey(occurrenceDate) <= endDayKey &&
      occurrenceNumber <= MAX_RECURRING_CHECKLIST_ITEMS
    ) {
      const dayKey = toDayKey(occurrenceDate);
      const matchingTask = tasksByDay.get(dayKey)?.[0];
      const itemDueDate = new Date(occurrenceDate);

      items.push({
        dueDate: itemDueDate,
        occurrenceNumber,
        taskId: matchingTask?.id,
        completedAt: matchingTask?.completedAt,
        status: classifyOccurrenceStatus(itemDueDate, matchingTask, referenceDate),
        isCurrent:
          matchingTask?.id === task.id ||
          (!matchingTask && isSameDay(itemDueDate, task.dueDate)),
      });

      occurrenceDate = incrementRecurrenceDate(occurrenceDate, task.recurrence);
      occurrenceNumber += 1;
    }
  } else {
    const seriesStartDate =
      task.recurrenceStartDate ??
      seriesTasks[0]?.recurrenceStartDate ??
      seriesTasks[0]?.dueDate;

    if (!seriesStartDate) {
      return null;
    }

    const selectedOccurrenceNumber = task.recurrenceOccurrence ?? 1;
    const projectedOccurrenceCount = Math.min(
      MAX_RECURRING_CHECKLIST_ITEMS,
      Math.max(
        OPEN_ENDED_RECURRING_CHECKLIST_PREVIEW_ITEMS,
        selectedOccurrenceNumber + 3
      )
    );

    let occurrenceDate = seriesStartDate;
    let occurrenceNumber = 1;

    while (occurrenceNumber <= projectedOccurrenceCount) {
      const dayKey = toDayKey(occurrenceDate);
      const matchingTask = tasksByDay.get(dayKey)?.[0];
      const itemDueDate = new Date(occurrenceDate);

      items.push({
        dueDate: itemDueDate,
        occurrenceNumber,
        taskId: matchingTask?.id,
        completedAt: matchingTask?.completedAt,
        status: classifyOccurrenceStatus(itemDueDate, matchingTask, referenceDate),
        isCurrent:
          matchingTask?.id === task.id ||
          (!matchingTask && isSameDay(itemDueDate, task.dueDate)),
      });

      occurrenceDate = incrementRecurrenceDate(occurrenceDate, task.recurrence);
      occurrenceNumber += 1;
    }
  }

  if (items.length === 0) {
    return null;
  }

  const completedCount = items.filter((item) => item.status === 'completed').length;
  const pendingCount = items.filter((item) => item.status === 'pending').length;
  const overdueCount = items.filter((item) => item.status === 'overdue').length;
  const upcomingCount = items.filter((item) => item.status === 'upcoming').length;

  return {
    items,
    totalCount: items.length,
    completedCount,
    pendingCount,
    overdueCount,
    upcomingCount,
  };
};
