import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Settings, Plus, Sprout, CheckSquare } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PlantList } from '../components/plants';
import { PlantForm } from '../components/plants/PlantForm';
import { SpaceForm } from '../components/spaces/SpaceForm';
import { NoteList } from '../components/notes/NoteList';
import { TaskForm } from '../components/tasks/TaskForm';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskCompletionDialog } from '../components/tasks/TaskCompletionDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { useAuthStore } from '../stores/authStore';
import { useSpaceStore } from '../stores/spaceStore';
import { usePlantStore } from '../stores/plantStore';
import { useTaskStore } from '../stores/taskStore';
import { useNoteStore } from '../stores/noteStore';
import { useToast } from '../components/ui/use-toast';
import type { Task } from '../lib/types';
import type { NoteCategory } from '../lib/types/note';

export function meta({ params }: { params: { spaceId: string } }) {
  return [
    { title: 'Space Details - Grospace' },
    { name: 'description', content: 'View and manage plants in your grow space' },
  ];
}

const spaceTypeLabels = {
  'indoor-tent': 'Indoor Tent',
  'outdoor-bed': 'Outdoor Bed',
  greenhouse: 'Greenhouse',
  hydroponic: 'Hydroponic',
  container: 'Container',
};

function SpaceDetailContent() {
  const { spaceId } = useParams();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddPlantDialog, setShowAddPlantDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [mobileSection, setMobileSection] = useState<'tasks' | 'notes'>(
    'tasks'
  );

  const { toast } = useToast();
  const { user } = useAuthStore();
  const { spaces, loading, error, loadSpaces, updateSpace } = useSpaceStore();
  const { plants, loadPlants } = usePlantStore();
  const {
    tasks,
    loading: tasksLoading,
    loadTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
  } = useTaskStore();
  const { createNote } = useNoteStore();

  useEffect(() => {
    if (!user) return;

    loadSpaces();
    loadPlants(spaceId);
    loadTasks();
  }, [user, spaceId, loadSpaces, loadPlants, loadTasks]);

  const space = spaces.find((s) => s.id === spaceId);

  const spaceTasks = useMemo(() => {
    if (!space) return [];

    return tasks
      .filter((task) => task.spaceId === space.id)
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'pending' ? -1 : 1;
        }

        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, space]);

  const handleUpdateSpace = async (data: { name: string; type: any; description?: string }) => {
    if (!space) return;

    try {
      await updateSpace(space.id, data);
      setShowEditDialog(false);
    } catch (error) {
      console.error('Failed to update space:', error);
    }
  };

  const openCreateTaskDialog = () => {
    setEditingTask(null);
    setShowTaskDialog(true);
  };

  const openEditTaskDialog = (task: Task) => {
    setEditingTask(task);
    setShowTaskDialog(true);
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

      setShowTaskDialog(false);
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
    const task = spaceTasks.find((item) => item.id === taskId);
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
        description: noteData ? 'Task completed and note added successfully' : 'Task completed successfully',
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

  if (loading && !space) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading space...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="mb-4 text-destructive">{error}</p>
          <Button onClick={() => loadSpaces()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold">Space Not Found</h2>
          <p className="mb-4 text-muted-foreground">
            The space you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link to="/spaces">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Spaces
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Navigation */}
      <div className="mb-6">
        <Link to="/spaces" className="inline-block">
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Spaces
          </Button>
        </Link>
      </div>

      {/* Header Content */}
      <div className="mb-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">{space.name}</h1>

            <div className="flex items-center gap-3 text-muted-foreground">
              <Badge variant="secondary" className="font-medium">
                {spaceTypeLabels[space.type]}
              </Badge>
              <span className="text-sm">|</span>
              <span className="text-sm font-medium">
                {space.plantCount} {space.plantCount === 1 ? 'plant' : 'plants'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setShowAddPlantDialog(true)}>
                  <Sprout className="mr-2 h-4 w-4" />
                  Add Plant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setShowEditDialog(true)} variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Edit Space
            </Button>
          </div>
        </div>

        {space.description && (
          <div className="max-w-2xl">
            <p className="leading-relaxed text-muted-foreground">{space.description}</p>
          </div>
        )}
      </div>

      {/* Space Details */}
      {(space.dimensions || space.environment) && (
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {space.dimensions && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Dimensions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="mb-1 block text-muted-foreground">Length</span>
                    <span className="font-medium">
                      {space.dimensions.length} {space.dimensions.unit}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-muted-foreground">Width</span>
                    <span className="font-medium">
                      {space.dimensions.width} {space.dimensions.unit}
                    </span>
                  </div>
                  {space.dimensions.height && (
                    <div>
                      <span className="mb-1 block text-muted-foreground">Height</span>
                      <span className="font-medium">
                        {space.dimensions.height} {space.dimensions.unit}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {space.environment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Environment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {space.environment.temperature && (
                    <div>
                      <span className="mb-1 block text-muted-foreground">Temperature</span>
                      <span className="font-medium">
                        {space.environment.temperature.min} - {space.environment.temperature.max}
                        {space.environment.temperature.unit === 'celsius' ? 'C' : 'F'}
                      </span>
                    </div>
                  )}
                  {space.environment.humidity && (
                    <div>
                      <span className="mb-1 block text-muted-foreground">Humidity</span>
                      <span className="font-medium">
                        {space.environment.humidity.min}% - {space.environment.humidity.max}%
                      </span>
                    </div>
                  )}
                  {space.environment.lightSchedule && (
                    <div className="col-span-2">
                      <span className="mb-1 block text-muted-foreground">Light Schedule</span>
                      <span className="font-medium">
                        {space.environment.lightSchedule.hoursOn}h on / {space.environment.lightSchedule.hoursOff}h off
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tasks in this space */}
      <div className="mb-10 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Space Workspace</h2>
            <p className="text-sm text-muted-foreground">
              Track space-level work and contextual notes side by side.
            </p>
          </div>
          <div
            className="inline-flex gap-2 rounded-lg border bg-background p-1 lg:hidden"
            data-testid="e2e-space-detail-section-switcher"
          >
            <Button
              type="button"
              size="sm"
              variant={mobileSection === 'tasks' ? 'default' : 'ghost'}
              data-testid="e2e-space-detail-show-tasks"
              onClick={() => setMobileSection('tasks')}
            >
              Tasks
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobileSection === 'notes' ? 'default' : 'ghost'}
              data-testid="e2e-space-detail-show-notes"
              onClick={() => setMobileSection('notes')}
            >
              Notes
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section
            className={`${mobileSection !== 'tasks' ? 'hidden lg:block' : ''} space-y-4`}
            data-testid="e2e-space-detail-tasks-pane"
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                Tasks in this Space
                <Badge variant="outline" className="ml-2 font-normal">
                  {spaceTasks.length}
                </Badge>
              </h3>
              <Button onClick={openCreateTaskDialog} size="sm">
                <CheckSquare className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>

            {tasksLoading && spaceTasks.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">Loading tasks...</p>
                </CardContent>
              </Card>
            ) : spaceTasks.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="mb-4 text-muted-foreground">No tasks attached to this space yet.</p>
                  <Button onClick={openCreateTaskDialog}>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Create First Space Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {spaceTasks.map((task) => (
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
            data-testid="e2e-space-detail-notes-pane"
          >
            <NoteList
              spaceId={space.id}
              title="Space Notes and Observations"
              showCreateButton={true}
              showDescription={false}
            />
          </section>
        </div>
      </div>

      {/* Plants in this space */}
      <div className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          Plants in this Space
          <Badge variant="outline" className="ml-2 font-normal">
            {space.plantCount}
          </Badge>
        </h2>
        <PlantList spaceId={space.id} spaces={spaces} showAddButton={false} />
      </div>

      {/* Add/Edit Task Dialog */}
      <Dialog
        open={showTaskDialog}
        onOpenChange={(open) => {
          setShowTaskDialog(open);
          if (!open) {
            setEditingTask(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create Space Task'}</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask || undefined}
            spaces={spaces}
            plants={plants}
            initialSpaceId={space.id}
            disableSpaceSelection={!editingTask}
            onSubmit={handleTaskFormSubmit}
            onCancel={() => {
              setShowTaskDialog(false);
              setEditingTask(null);
            }}
            isLoading={false}
          />
        </DialogContent>
      </Dialog>

      {/* Task Completion Dialog */}
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

      {/* Add Plant Dialog */}
      <Dialog open={showAddPlantDialog} onOpenChange={setShowAddPlantDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Plant</DialogTitle>
          </DialogHeader>
          <PlantForm
            spaces={spaces}
            defaultSpaceId={space.id}
            onSuccess={() => {
              setShowAddPlantDialog(false);
              loadSpaces();
              loadPlants(space.id);
            }}
            onCancel={() => setShowAddPlantDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Space Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Space</DialogTitle>
          </DialogHeader>
          <SpaceForm
            space={space}
            onSubmit={handleUpdateSpace}
            onCancel={() => setShowEditDialog(false)}
            isLoading={loading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SpaceDetailPage() {
  return (
    <ProtectedRoute>
      <SpaceDetailContent />
    </ProtectedRoute>
  );
}
