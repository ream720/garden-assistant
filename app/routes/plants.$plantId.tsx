import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, CheckSquare } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { PlantDetails } from '../components/plants/PlantDetails';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { TaskForm } from '../components/tasks/TaskForm';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskCompletionDialog } from '../components/tasks/TaskCompletionDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
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
    { title: `Plant Details - Grospace` },
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

  useEffect(() => {
    if (user) {
      loadSpaces();
      loadPlants();
      loadNotes(user.uid);
      loadTasks();
    }
  }, [user, loadSpaces, loadPlants, loadNotes, loadTasks]);

  const plant = plants.find((p) => p.id === plantId);

  const plantTasks = useMemo(() => {
    if (!plant) return [];

    return tasks
      .filter((task) => task.plantId === plant.id)
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'pending' ? -1 : 1;
        }

        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, plant]);

  const plantActivities = useMemo(() => {
    if (!plant || !user) return [];

    return activityService.generateActivities(notes, tasks, [plant], spaces, { plantId: plant.id, limit: 50 });
  }, [plant, user, notes, tasks, spaces]);

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

  if (plantsLoading && !plant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
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
          <h2 className="text-2xl font-bold mb-4">Plant Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The plant you're looking for doesn't exist or you don't have access to it.
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
    <div className="container mx-auto px-4 py-8 space-y-8">
      <PlantDetails
        plant={plant}
        spaces={spaces}
        onBack={() => window.history.back()}
        onUpdate={() => loadPlants()}
      />

      {/* Tasks for this plant */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Plant Tasks
            <Badge variant="outline" className="ml-2 font-normal">
              {plantTasks.length}
            </Badge>
          </h2>
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
              <p className="mb-4 text-muted-foreground">No tasks attached to this plant yet.</p>
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
            <DialogTitle>{editingTask ? 'Edit Plant Task' : 'Create Plant Task'}</DialogTitle>
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
