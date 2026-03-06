import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { CheckCircle2, FileText, Building2, Sprout } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';

import type { Task, GrowSpace, Plant } from '../../lib/types';
import type { NoteCategory } from '../../lib/types/note';
import { format } from 'date-fns';

interface CompletionFormData {
  createNote: boolean;
  noteContent?: string;
  noteCategory: NoteCategory;
}

interface TaskCompletionDialogProps {
  task: Task | null;
  spaces: GrowSpace[];
  plants: Plant[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (
    taskId: string,
    noteData?: {
      content: string;
      category: NoteCategory;
      plantId?: string;
      spaceId?: string;
    }
  ) => Promise<void>;
}

const getSuggestedNoteCategory = (task: Task): NoteCategory => {
  const normalizedTitle = task.title.toLowerCase();

  if (normalizedTitle.includes('feed') || normalizedTitle.includes('fertiliz') || normalizedTitle.includes('nutrient')) {
    return 'feeding';
  }

  if (normalizedTitle.includes('prun') || normalizedTitle.includes('trim')) {
    return 'pruning';
  }

  if (normalizedTitle.includes('issue') || normalizedTitle.includes('pest') || normalizedTitle.includes('disease')) {
    return 'issue';
  }

  return 'milestone';
};

const buildSuggestedNoteContent = (task: Task): string => {
  const dueDateText = format(task.dueDate, 'MMM d, yyyy');
  const summary = `Completed task: ${task.title} (Due ${dueDateText}, Priority ${task.priority}).`;

  if (task.description) {
    return `${summary}\n\nTask details: ${task.description}`;
  }

  return summary;
};

export function TaskCompletionDialog({
  task,
  spaces,
  plants,
  open,
  onOpenChange,
  onComplete,
}: TaskCompletionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultCreateNote = useMemo(() => Boolean(task?.plantId || task?.spaceId), [task]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CompletionFormData>({
    defaultValues: {
      createNote: defaultCreateNote,
      noteContent: task ? buildSuggestedNoteContent(task) : '',
      noteCategory: task ? getSuggestedNoteCategory(task) : 'milestone',
    },
  });

  useEffect(() => {
    if (!task || !open) {
      return;
    }

    reset({
      createNote: Boolean(task.plantId || task.spaceId),
      noteContent: buildSuggestedNoteContent(task),
      noteCategory: getSuggestedNoteCategory(task),
    });
  }, [task, open, reset]);

  const watchCreateNote = watch('createNote');

  // Find associated space and plant
  const associatedSpace = task?.spaceId ? spaces.find((space) => space.id === task.spaceId) : null;
  const associatedPlant = task?.plantId ? plants.find((plant) => plant.id === task.plantId) : null;

  const handleFormSubmit = async (data: CompletionFormData) => {
    if (!task) return;

    setIsSubmitting(true);
    try {
      let noteData;

      if (data.createNote) {
        noteData = {
          content: data.noteContent?.trim() || buildSuggestedNoteContent(task),
          category: data.noteCategory || getSuggestedNoteCategory(task),
          plantId: task.plantId,
          spaceId: task.spaceId,
        };
      }

      await onComplete(task.id, noteData);

      // Reset form and close dialog
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span>Complete Task</span>
          </DialogTitle>
          <DialogDescription>
            Mark this task as completed and optionally log it as a note so plant and space history stays complete.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Task Details */}
          <div className="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-slate-800">
            <h4 className="font-medium">{task.title}</h4>
            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                Due: {format(task.dueDate, 'MMM d, yyyy')}
              </Badge>
              <Badge className="text-xs">{task.priority}</Badge>
            </div>

            {(associatedSpace || associatedPlant) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {associatedSpace && (
                  <Badge variant="secondary" className="text-xs">
                    <Building2 className="mr-1 h-3 w-3" />
                    {associatedSpace.name}
                  </Badge>
                )}
                {associatedPlant && (
                  <Badge variant="secondary" className="text-xs">
                    <Sprout className="mr-1 h-3 w-3" />
                    {associatedPlant.name}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Create Note Option */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="createNote"
                checked={watchCreateNote}
                onChange={(e) => setValue('createNote', e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="createNote" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Create a linked completion note</span>
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              This creates a note entry in your Notes history tied to the same plant/space, so scheduled work and long-term records stay connected.
            </p>

            {watchCreateNote && (
              <div className="space-y-4 border-l-2 border-gray-200 pl-6 dark:border-gray-700">
                <div className="space-y-2">
                  <Label htmlFor="noteCategory">Note Category</Label>
                  <Select
                    value={watch('noteCategory')}
                    onValueChange={(value: NoteCategory) => setValue('noteCategory', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="observation">Observation</SelectItem>
                      <SelectItem value="feeding">Feeding</SelectItem>
                      <SelectItem value="pruning">Pruning</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="noteContent">Note</Label>
                  <Textarea
                    id="noteContent"
                    {...register('noteContent')}
                    placeholder="Describe what you accomplished or observed..."
                    rows={4}
                    className={errors.noteContent ? 'border-red-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    This note is stored with the task&apos;s plant/space so history stays in one place.
                  </p>
                  {errors.noteContent && <p className="text-sm text-red-500">{errors.noteContent.message}</p>}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? 'Completing...' : 'Complete Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

