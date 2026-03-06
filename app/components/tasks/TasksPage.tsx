import { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useToast } from '../ui/use-toast';

import { TaskList } from './TaskList';
import { TaskForm } from './TaskForm';
import { TaskCompletionDialog } from './TaskCompletionDialog';

import { useTaskStore } from '../../stores/taskStore';
import { useSpaceStore } from '../../stores/spaceStore';
import { usePlantStore } from '../../stores/plantStore';
import { useNoteStore } from '../../stores/noteStore';
import { useAuthStore } from '../../stores/authStore';

import type { Task } from '../../lib/types';
import type { NoteCategory } from '../../lib/types/note';

interface TasksPageProps {
  embedded?: boolean;
  compactIntro?: boolean;
}

export function TasksPage({ embedded = false, compactIntro = false }: TasksPageProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    loadTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    clearError: clearTasksError,
  } = useTaskStore();

  const {
    spaces,
    loading: spacesLoading,
    loadSpaces,
  } = useSpaceStore();

  const {
    plants,
    loading: plantsLoading,
    loadPlants,
  } = usePlantStore();

  const { createNote } = useNoteStore();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (user) {
      loadTasks();
      loadSpaces();
      loadPlants();
    }
  }, [user, loadTasks, loadSpaces, loadPlants]);

  useEffect(() => {
    if (tasksError) {
      toast({
        title: 'Error',
        description: tasksError,
        variant: 'destructive',
      });
      clearTasksError();
    }
  }, [tasksError, toast, clearTasksError]);

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskFormSubmit = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
        toast({
          title: 'Success',
          description: 'Task updated successfully',
        });
      } else {
        await createTask(taskData);
        toast({
          title: 'Success',
          description: 'Task created successfully',
        });
      }
      setShowTaskForm(false);
      setEditingTask(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save task',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (task) {
      setCompletingTask(task);
    }
  };

  const handleTaskCompletion = async (
    taskId: string,
    noteData?: {
      content: string;
      category: NoteCategory;
      plantId?: string;
      spaceId?: string;
    }
  ) => {
    try {
      await completeTask(taskId);

      if (noteData && user) {
        await createNote(
          {
            content: noteData.content,
            category: noteData.category,
            plantId: noteData.plantId,
            spaceId: noteData.spaceId,
            timestamp: new Date(),
          },
          user.uid
        );
      }

      toast({
        title: 'Success',
        description: noteData
          ? 'Task completed and note added successfully'
          : 'Task completed successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete task',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const handleCreateNoteFromTask = () => {
    toast({
      title: 'Feature Coming Soon',
      description: 'Direct note creation from tasks will be available soon',
    });
  };

  const isLoading = tasksLoading || spacesLoading || plantsLoading;
  const pageClassName = embedded ? 'space-y-6' : 'container mx-auto py-6 space-y-6';

  return (
    <div className={pageClassName}>
      <TaskList
        tasks={tasks}
        spaces={spaces}
        plants={plants}
        loading={isLoading}
        onCreateTask={handleCreateTask}
        onEditTask={handleEditTask}
        onCompleteTask={handleCompleteTask}
        onDeleteTask={handleDeleteTask}
        onCreateNote={handleCreateNoteFromTask}
        showDescription={!compactIntro}
      />

      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask || undefined}
            spaces={spaces}
            plants={plants}
            onSubmit={handleTaskFormSubmit}
            onCancel={() => {
              setShowTaskForm(false);
              setEditingTask(null);
            }}
            isLoading={false}
          />
        </DialogContent>
      </Dialog>

      <TaskCompletionDialog
        task={completingTask}
        spaces={spaces}
        plants={plants}
        open={!!completingTask}
        onOpenChange={(open) => !open && setCompletingTask(null)}
        onComplete={handleTaskCompletion}
      />
    </div>
  );
}

