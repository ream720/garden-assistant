import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, CheckSquare } from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

import { FeatureHelpPopover } from '../shared/FeatureHelpPopover';
import { cn } from '../../lib/utils';
import { formatPlantDisplayName } from '../../lib/utils/plantDisplay';

import type { Task, TaskPriority, GrowSpace, Plant } from '../../lib/types';
import { useAuthStore } from '../../stores/authStore';

const taskSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
    description: z.string().optional(),
    dueDate: z.date(),
    priority: z.enum(['low', 'medium', 'high']),
    spaceId: z.string().optional(),
    plantId: z.string().optional(),
    hasRecurrence: z.boolean(),
    recurrenceType: z.enum(['daily', 'weekly', 'monthly']).optional(),
    recurrenceInterval: z.number().min(1).max(365).optional(),
    recurrenceEndDate: z.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.hasRecurrence) {
      return;
    }

    if (!data.recurrenceType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Recurrence type is required',
        path: ['recurrenceType'],
      });
    }

    if (!data.recurrenceInterval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Recurrence interval is required',
        path: ['recurrenceInterval'],
      });
    }
  });

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: Task;
  spaces: GrowSpace[];
  plants: Plant[];
  onSubmit: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialSpaceId?: string;
  initialPlantId?: string;
  disableSpaceSelection?: boolean;
  disablePlantSelection?: boolean;
}

const priorityDescriptions: Record<TaskPriority, string> = {
  low: 'Low priority works well for routine or flexible care that can wait a bit.',
  medium: 'Medium priority is a good default for normal planned maintenance.',
  high: 'High priority is best for urgent care, time-sensitive work, or anything that could become a problem quickly.',
};

export function TaskForm({
  task,
  spaces,
  plants,
  onSubmit,
  onCancel,
  isLoading = false,
  initialSpaceId,
  initialPlantId,
  disableSpaceSelection = false,
  disablePlantSelection = false,
}: TaskFormProps) {
  const { user } = useAuthStore();
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const initialPlant = useMemo(
    () => (initialPlantId ? plants.find((plant) => plant.id === initialPlantId) : undefined),
    [initialPlantId, plants]
  );

  const resolvedInitialSpaceId = task?.spaceId || initialSpaceId || initialPlant?.spaceId;
  const resolvedInitialPlantId = task?.plantId || initialPlantId;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      dueDate: task?.dueDate || new Date(),
      priority: task?.priority || 'medium',
      spaceId: resolvedInitialSpaceId || undefined,
      plantId: resolvedInitialPlantId || undefined,
      hasRecurrence: !!task?.recurrence,
      recurrenceType: task?.recurrence?.type || 'weekly',
      recurrenceInterval: task?.recurrence?.interval || 1,
      recurrenceEndDate: task?.recurrence?.endDate,
    },
  });

  useEffect(() => {
    reset({
      title: task?.title || '',
      description: task?.description || '',
      dueDate: task?.dueDate || new Date(),
      priority: task?.priority || 'medium',
      spaceId: task?.spaceId || resolvedInitialSpaceId || undefined,
      plantId: task?.plantId || resolvedInitialPlantId || undefined,
      hasRecurrence: !!task?.recurrence,
      recurrenceType: task?.recurrence?.type || 'weekly',
      recurrenceInterval: task?.recurrence?.interval || 1,
      recurrenceEndDate: task?.recurrence?.endDate,
    });
  }, [task, resolvedInitialSpaceId, resolvedInitialPlantId, reset]);

  const watchedSpaceId = watch('spaceId');
  const watchedHasRecurrence = watch('hasRecurrence');
  const watchedDueDate = watch('dueDate');
  const watchedEndDate = watch('recurrenceEndDate');
  const watchedPriority = watch('priority');

  const filteredPlants = watchedSpaceId
    ? plants.filter((plant) => plant.spaceId === watchedSpaceId)
    : plants;

  const shouldDisablePlantSelect = disablePlantSelection || (!watchedSpaceId && plants.length > 10);

  const handleFormSubmit = async (data: TaskFormData) => {
    if (!user) return;

    try {
      let recurrence: Task['recurrence'] = undefined;
      if (data.hasRecurrence) {
        if (!data.recurrenceType || !data.recurrenceInterval) {
          return;
        }

        recurrence = {
          type: data.recurrenceType,
          interval: data.recurrenceInterval,
          endDate: data.recurrenceEndDate,
        };
      }

      const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.uid,
        title: data.title,
        description: data.description || undefined,
        dueDate: data.dueDate,
        priority: data.priority,
        status: task?.status || 'pending',
        spaceId: data.spaceId || undefined,
        plantId: data.plantId || undefined,
        recurrence,
        completedAt: task?.completedAt,
      };

      await onSubmit(taskData);
    } catch (error) {
      console.error('Failed to submit task form:', error);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-700" />
                <p className="text-sm font-semibold text-blue-950">Tasks are for scheduled care</p>
              </div>
              <p className="text-sm text-blue-900/80">
                Use a task for work that should happen on a specific date or repeat over time, like germinating, transplanting, feeding, pruning, or inspections.
              </p>
              <p className="text-sm text-blue-900/80">
                Tasks do not support photos. If you want visual records or open-ended context, create a note instead.
              </p>
            </div>
            <FeatureHelpPopover
              label="When to use tasks"
              title="Use tasks when something needs to be done later"
              description="Tasks help you plan important care actions, prioritize them, and optionally repeat them on a schedule."
              items={[
                'Set a due date so important work does not get lost.',
                'Attach the task to a space or plant so the context stays clear.',
                'Use recurrence for routine maintenance like feeding or inspections.',
                'Complete the task with a linked note when you want the outcome saved in history.',
              ]}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Example: Transplant tomato into 5 gallon pot"
            className={errors.title ? 'border-red-500' : ''}
          />
          <p className="text-sm text-muted-foreground">
            Keep the title action-oriented so it is obvious what needs to happen when the task comes due.
          </p>
          {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Optional details such as nutrient amount, tools needed, or what to check when you complete the task."
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Add extra detail only if it will help you or someone else complete the task correctly later.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !watchedDueDate && 'text-muted-foreground',
                  errors.dueDate && 'border-red-500'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {watchedDueDate ? format(watchedDueDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={watchedDueDate}
                onSelect={(date) => {
                  if (date) {
                    setValue('dueDate', date);
                    setDueDateOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-sm text-muted-foreground">
            Choose the date you want to be reminded to do the work. If the work already happened and you only want a record, use a note instead.
          </p>
          {errors.dueDate && <p className="text-sm text-red-500">{errors.dueDate.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={watchedPriority} onValueChange={(value: TaskPriority) => setValue('priority', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{priorityDescriptions[watchedPriority]}</p>
        </div>

        <div className="space-y-2">
          <Label>Grow Space (Optional)</Label>
          <Select
            value={watchedSpaceId || 'none'}
            onValueChange={(value) => {
              setValue('spaceId', value === 'none' ? undefined : value);
              setValue('plantId', undefined);
            }}
            disabled={disableSpaceSelection}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a grow space" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific space</SelectItem>
              {spaces.map((space) => (
                <SelectItem key={space.id} value={space.id}>
                  {space.name} ({space.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {disableSpaceSelection ? (
            <p className="text-sm text-muted-foreground">This task is locked to the current space context.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Attach the task to a space when the work applies to the environment as a whole or to multiple plants in that area.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Plant (Optional)</Label>
          <Select
            value={watch('plantId') || 'none'}
            onValueChange={(value) => setValue('plantId', value === 'none' ? undefined : value)}
            disabled={shouldDisablePlantSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a plant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific plant</SelectItem>
              {filteredPlants.map((plant) => (
                <SelectItem key={plant.id} value={plant.id}>
                  {formatPlantDisplayName(plant)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {disablePlantSelection ? (
            <p className="text-sm text-muted-foreground">This task is locked to the current plant context.</p>
          ) : !watchedSpaceId && plants.length > 10 ? (
            <p className="text-sm text-muted-foreground">Select a grow space first to narrow the plant list.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Attach to a plant when the task is specific to one plant rather than the whole space.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasRecurrence"
              checked={watchedHasRecurrence}
              onChange={(e) => setValue('hasRecurrence', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="hasRecurrence">Recurring Task</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Turn this on for repeatable maintenance like feeding, inspections, or other routine care.
          </p>

          {watchedHasRecurrence && (
            <div className="space-y-4 border-l-2 border-gray-200 pl-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Repeat Every</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      {...register('recurrenceInterval', { valueAsNumber: true })}
                      className="w-20"
                    />
                    <Select
                      value={watch('recurrenceType')}
                      onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setValue('recurrenceType', value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Day(s)</SelectItem>
                        <SelectItem value="weekly">Week(s)</SelectItem>
                        <SelectItem value="monthly">Month(s)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !watchedEndDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedEndDate ? format(watchedEndDate, 'PPP') : 'No end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchedEndDate}
                      onSelect={(date) => {
                        setValue('recurrenceEndDate', date);
                        setEndDateOpen(false);
                      }}
                      disabled={(date) => date < watchedDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-muted-foreground">
                  Leave this empty if the task should continue until you decide to stop it.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting || isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </div>
  );
}
