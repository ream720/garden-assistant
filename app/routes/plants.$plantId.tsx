import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, CheckSquare } from 'lucide-react';

import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { PlantDetails } from '../components/plants/PlantDetails';
import { NoteList } from '../components/notes/NoteList';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { TaskForm } from '../components/tasks/TaskForm';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskCompletionDialog } from '../components/tasks/TaskCompletionDialog';

import { useAuthStore } from '../stores/authStore';
import { useSpaceStore } from '../stores/spaceStore';
import { usePlantStore } from '../stores/plantStore';
import { useNoteStore } from '../stores/noteStore';
import { useTaskStore } from '../stores/taskStore';
import { useToast } from '../components/ui/use-toast';

import { activityService } from '../lib/services/activityService';
import type { Task } from '../lib/types';
import type { NoteCategory } from '../lib/types/note';

export function meta({ params }: { params: { plantId: string } }) {
  return [
    { title: 'Plant Details - Grospace' },
    { name: 'description', content: 'View plant details and history' },
  ];
}

function PlantDetailPageContent() {
  const { plantId } = useParams();
  const { user } = useAuthStore();
  const { spaces, loadSpaces } = useSpaceStore();
  const { plants, loadPlants, loading: plantsLoading } = usePlantStore();
  const { notes, loadNotes, createNote } = useNoteStore();
  const {
    tasks,
    loading: tasksLoading,
    loadTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
  } = useTaskStore();
  const { toast } = useToast();

  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [mobileSection, setMobileSection] = useState<'tasks' | 'notes'>('tasks');

  useEffect(() => {
    if (!user) {
      return;
    }

    loadSpaces();
    loadPlants();
    loadNotes(user.uid);
    loadTasks();
  }, [user, loadSpaces, loadPlants, loadNotes, loadTasks]);

  const plant = plants.find((item) => item.id === plantId);

  const plantTasks = useMemo(() => {
    if (!plant) {
      return [];
    }

    return tasks
      .filter((task) => task.plantId === plant.id)
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === 'pending' ? -1 : 1;
        }

        return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
      });
  }, [tasks, plant]);

  const plantActivities = useMemo(() => {
    if (!plant || !user) {
      return [];
    }

    return activityService.generateActivities(notes, tasks, [plant], spaces, {
      plantId: plant.id,
      limit: 50,
    });
  }, [plant, user, notes, tasks, spaces]);

  const openCreateTaskDialog = () => {
    setEditingTask(null);
    setShowTaskDialog(true);
  };

  const openEditTaskDialog = (task: Task) => {
    setEditingTask(task);
    setShowTaskDialog(true);
  };

  const handleTaskFormSubmit = async (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
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

      setShowTaskDialog(false);
      setEditingTask(null);
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to save task',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteTask = (taskId: string) => {
    const task = plantTasks.find((item) => item.id === taskId);
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
        description:
          error instanceof Error ? error.message : 'Failed to complete task',
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
        description:
          error instanceof Error ? error.message : 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  if (plantsLoading && !plant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading plant...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold">Plant Not Found</h2>
          <p className="mb-4 text-muted-foreground">
            The plant you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Link to="/plants">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Plants
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <PlantDetails
        plant={plant}
        spaces={spaces}
        onBack={() => window.history.back()}
        onUpdate={() => loadPlants()}
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Plant Workspace</h2>
            <p className="text-sm text-muted-foreground">
              Keep plant-specific tasks and notes in one focused view.
            </p>
          </div>

          <div
            className="inline-flex gap-2 rounded-lg border bg-background p-1 lg:hidden"
            data-testid="e2e-plant-detail-section-switcher"
          >
            <Button
              type="button"
              size="sm"
              variant={mobileSection === 'tasks' ? 'default' : 'ghost'}
              data-testid="e2e-plant-detail-show-tasks"
              onClick={() => setMobileSection('tasks')}
            >
              Tasks
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobileSection === 'notes' ? 'default' : 'ghost'}
              data-testid="e2e-plant-detail-show-notes"
              onClick={() => setMobileSection('notes')}
            >
              Notes
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section
            className={`${mobileSection !== 'tasks' ? 'hidden lg:block' : ''} space-y-4`}
            data-testid="e2e-plant-detail-tasks-pane"
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                Plant Tasks
                <Badge variant="outline" className="ml-2 font-normal">
                  {plantTasks.length}
                </Badge>
              </h3>
              <Button onClick={openCreateTaskDialog} size="sm">
                <CheckSquare className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>

            {tasksLoading && plantTasks.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">Loading tasks...</p>
                </CardContent>
              </Card>
            ) : plantTasks.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="mb-4 text-muted-foreground">
                    No tasks attached to this plant yet.
                  </p>
                  <Button onClick={openCreateTaskDialog}>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Create First Plant Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {plantTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    spaces={spaces}
                    plants={plants}
                    onComplete={handleCompleteTask}
                    onEdit={openEditTaskDialog}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            )}
          </section>

          <section
            className={mobileSection !== 'notes' ? 'hidden lg:block' : ''}
            data-testid="e2e-plant-detail-notes-pane"
          >
            <NoteList
              plantId={plant.id}
              title="Plant Notes"
              showCreateButton={true}
              showDescription={false}
            />
          </section>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">History</h2>
        <ActivityFeed
          activities={plantActivities}
          title="Plant History"
          description={`Timeline of events for ${plant.name}`}
          emptyMessage="No history available for this plant yet."
        />
      </div>

      <Dialog
        open={showTaskDialog}
        onOpenChange={(open) => {
          setShowTaskDialog(open);
          if (!open) {
            setEditingTask(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Plant Task' : 'Create Plant Task'}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask || undefined}
            spaces={spaces}
            plants={plants}
            initialSpaceId={plant.spaceId}
            initialPlantId={plant.id}
            disableSpaceSelection={true}
            disablePlantSelection={true}
            onSubmit={handleTaskFormSubmit}
            onCancel={() => {
              setShowTaskDialog(false);
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
        onOpenChange={(open) => {
          if (!open) {
            setCompletingTask(null);
          }
        }}
        onComplete={handleTaskCompletion}
      />
    </div>
  );
}

export default function PlantDetailPage() {
  return (
    <ProtectedRoute>
      <PlantDetailPageContent />
    </ProtectedRoute>
  );
}
