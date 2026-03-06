import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Building2,
  Sprout,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Calendar,
  StickyNote,
  ShoppingBasket,
} from 'lucide-react';
import { format, isAfter, differenceInDays } from 'date-fns';
import type { Route } from './+types/dashboard';
import type { Task } from '~/lib/types';
import type { NoteCategory } from '~/lib/types/note';
import { Button } from '~/components/ui/button';
import { ProtectedRoute } from '~/components/routing/ProtectedRoute';
import { useAuthStore } from '~/stores/authStore';
import { useSpaceStore } from '~/stores/spaceStore';
import { usePlantStore } from '~/stores/plantStore';
import { useTaskStore } from '~/stores/taskStore';
import { useNoteStore } from '~/stores/noteStore';
import { DashboardLayout } from '~/components/dashboard/DashboardLayout';
import { PlantStageDistribution } from '~/components/dashboard/PlantStageDistribution';
import { TaskCompletionDialog } from '~/components/tasks/TaskCompletionDialog';
import { activityService } from '~/lib/services/activityService';
import { cn } from '~/lib/utils';

// Forms for Quick Action modals
import { PlantForm } from '~/components/plants/PlantForm';
import { SpaceForm } from '~/components/spaces/SpaceForm';
import { TaskForm } from '~/components/tasks/TaskForm';
import { NoteForm } from '~/components/notes/NoteForm';
import { FeatureHelpPopover } from '~/components/shared/FeatureHelpPopover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '~/components/ui/dialog';

const ONBOARDING_STORAGE_KEY_PREFIX = 'grospace:onboarding';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Dashboard - Grospace' },
    { name: 'description', content: 'Your garden management dashboard' },
  ];
}

function DashboardContent() {
  const { user } = useAuthStore();
  const { spaces, loadSpaces, createSpace, loading: spacesLoading } = useSpaceStore();
  const { plants, loadPlants, loading: plantsLoading } = usePlantStore();
  const { tasks, loadTasks, completeTask, loading: tasksLoading } = useTaskStore();
  const { notes, loadNotes, createNote, loading: notesLoading } = useNoteStore();

  // Quick Action modal states
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (user) {
      loadSpaces();
      loadPlants();
      loadTasks();
      loadNotes(user.uid, { limit: 5 });
    }
  }, [user, loadSpaces, loadPlants, loadTasks, loadNotes]);

  useEffect(() => {
    if (!user) {
      setShowOnboarding(false);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const onboardingKey = `${ONBOARDING_STORAGE_KEY_PREFIX}:${user.uid}`;
    const hasSeenOnboarding = window.localStorage.getItem(onboardingKey) === 'seen';

    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [user]);

  const dismissOnboarding = () => {
    if (typeof window !== 'undefined' && user) {
      const onboardingKey = `${ONBOARDING_STORAGE_KEY_PREFIX}:${user.uid}`;
      window.localStorage.setItem(onboardingKey, 'seen');
    }

    setShowOnboarding(false);
  };

  const activePlants = plants.filter((p) => p.status !== 'harvested' && p.status !== 'removed').length;
  const harvestedPlants = plants.filter((p) => p.status === 'harvested').length;

  // "Open Issues" / High Priority Tasks
  const highPriorityTasks = tasks.filter((t) => t.priority === 'high' && t.status === 'pending');
  const overdueTasks = tasks.filter((t) => t.status === 'pending' && isAfter(new Date(), t.dueDate));
  const openIssuesCount = new Set([
    ...highPriorityTasks.map((task) => task.id),
    ...overdueTasks.map((task) => task.id),
  ]).size;

  // Tasks Due (Next 24 Hours)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfWindow = new Date(startOfToday);
  endOfWindow.setDate(endOfWindow.getDate() + 1);
  const tasksDueSoon = tasks.filter((task) => {
    if (task.status !== 'pending') {
      return false;
    }

    const dueDate = new Date(task.dueDate);
    return dueDate >= startOfToday && dueDate <= endOfWindow;
  });

  // Recent Activity with Description
  const activities = useMemo(() => {
    const rawActivities = activityService.generateActivities(notes, tasks, plants, spaces, { limit: 5 });
    return rawActivities.map((activity) => ({
      ...activity,
      description: activityService.formatActivityDescription(activity),
    }));
  }, [notes, tasks, plants, spaces]);

  // Recent Tasks for the list
  const recentTasks = tasks
    .filter((t) => t.status === 'pending')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const isLoading = spacesLoading || plantsLoading || tasksLoading || notesLoading;

  const statTileClassName =
    'block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-gray-700 dark:bg-slate-800';

  // Helper for generating activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note_created':
        return StickyNote;
      case 'task_completed':
        return CheckCircle2;
      case 'plant_added':
        return Sprout;
      case 'plant_harvested':
        return ShoppingBasket;
      case 'space_created':
        return Building2;
      default:
        return Sprout;
    }
  };

  // Helper for generating activity colors
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'note_created':
        return 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300';
      case 'task_completed':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300';
      case 'plant_added':
        return 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300';
      case 'plant_harvested':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  // Handle marking a task as complete from dashboard
  const handleMarkComplete = (taskId: string) => {
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
  };

  // Quick Action handlers
  const handleCreateSpace = async (data: { name: string; type: any; description?: string }) => {
    if (!user) return;
    try {
      await createSpace({ ...data, userId: user.uid });
      setShowAddSpace(false);
    } catch (error) {
      console.error('Failed to create space:', error);
    }
  };

  const handleCreateNote = async (data: any) => {
    if (!user) return;
    try {
      await createNote(data, user.uid);
      setShowAddNote(false);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  // Loading skeleton
  if (isLoading && plants.length === 0 && tasks.length === 0) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex-1 space-y-8">
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-slate-800"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-8">
              <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-800" />
              <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-800" />
            </div>
            <div className="space-y-8 lg:col-span-4">
              <div className="h-48 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-800" />
              <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="flex-1 space-y-8">
        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Active Plants */}
          <Link to="/plants?status=active" className={statTileClassName}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Plants</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{activePlants}</p>
                <p className="mt-1 flex items-center text-xs font-medium text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />+
                  {plants.filter((p) => differenceInDays(new Date(), new Date(p.plantedDate)) <= 7).length} this week
                </p>
              </div>
              <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                <Sprout className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Link>

          {/* Open Issues (High Priority + Overdue Pending Tasks) */}
          <Link to="/tasks?tab=issues" className={statTileClassName}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Open Issues</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{openIssuesCount}</p>
                <p className="mt-1 text-xs font-medium text-red-500 dark:text-red-400">Needs Attention</p>
              </div>
              <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </Link>

          {/* Tasks Due Soon */}
          <Link to="/tasks?tab=dueSoon" className={statTileClassName}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tasks Due</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{tasksDueSoon.length}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Next 24 Hours</p>
              </div>
              <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-900/30">
                <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </Link>

          {/* Total Harvests */}
          <Link to="/plants?status=harvested" className={statTileClassName}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Harvests</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{harvestedPlants}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">All Time</p>
              </div>
              <div className="rounded-lg bg-yellow-100 p-3 dark:bg-yellow-900/30">
                <ShoppingBasket className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </Link>
        </div>

        {/* Main Content Areas */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column (8 cols) */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            {/* Priority/Upcoming Tasks */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-slate-900/50">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Upcoming Tasks</h3>
                <Link to="/tasks" className="text-sm font-medium text-primary hover:text-primary/80">
                  View All
                </Link>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentTasks.length > 0 ? (
                  recentTasks.map((task) => {
                    const associatedPlant = task.plantId ? plants.find((plant) => plant.id === task.plantId) : null;
                    const associatedSpace = task.spaceId ? spaces.find((space) => space.id === task.spaceId) : null;

                    return (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between p-4 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-1 h-4 w-4 flex-shrink-0 rounded-full border-2',
                              task.priority === 'high'
                                ? 'border-red-400 dark:border-red-500'
                                : task.priority === 'medium'
                                  ? 'border-yellow-400 dark:border-yellow-500'
                                  : 'border-blue-400 dark:border-blue-500'
                            )}
                          ></div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{task.title}</p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              Due: {format(new Date(task.dueDate), 'MMM d')} -
                              <span
                                className={cn(
                                  'ml-1',
                                  task.priority === 'high'
                                    ? 'text-red-500'
                                    : task.priority === 'medium'
                                      ? 'text-yellow-500'
                                      : 'text-blue-500'
                                )}
                              >
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                              </span>
                            </p>
                            {(associatedPlant || associatedSpace) && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {associatedPlant ? `Plant: ${associatedPlant.name}` : null}
                                {associatedPlant && associatedSpace ? ' | ' : null}
                                {associatedSpace ? `Space: ${associatedSpace.name}` : null}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-primary"
                          onClick={() => handleMarkComplete(task.id)}
                        >
                          Mark Complete
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <p>No upcoming tasks.</p>
                    <Link to="/tasks" className="mt-1 inline-block text-sm text-primary hover:text-primary/80">
                      Create your first task
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-800">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-slate-900/50">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Activity</h3>
              </div>
              <div className="p-6">
                <ol className="relative ml-3 space-y-8 border-l border-gray-200 dark:border-gray-700">
                  {activities.map((activity) => {
                    const ActivityIcon = getActivityIcon(activity.type);
                    return (
                      <li key={activity.id} className="ml-6">
                        <span
                          className={cn(
                            'absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white dark:ring-slate-800',
                            getActivityColor(activity.type)
                          )}
                        >
                          <div className="rounded-full p-1.5">
                            <ActivityIcon className="h-4 w-4" />
                          </div>
                        </span>
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-slate-900/50">
                          <div className="mb-2 items-center justify-between sm:flex">
                            <time className="mb-1 text-xs font-normal text-gray-400 sm:order-last sm:mb-0">
                              {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                            </time>
                            <div className="text-sm font-normal text-gray-500 dark:text-gray-300">
                              {activity.description}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {activities.length === 0 && <li className="ml-6 text-gray-500">No recent activity.</li>}
                </ol>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) */}
          <div className="flex flex-col gap-8 lg:col-span-4">
                        {/* Quick Actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-slate-800">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Quick Actions</h3>
                <FeatureHelpPopover
                  label="Quick action help"
                  title="Choose Notes or Tasks based on intent"
                  description="Notes and tasks work together, but they serve different goals."
                  items={[
                    'Use notes for observations, context, and photo records.',
                    'Use tasks for scheduled work with due dates and recurrence.',
                    'Complete a task with a linked note when you want outcome history.',
                  ]}
                />
              </div>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Notes log what happened. Tasks schedule what must happen next.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowAddPlant(true)}
                  className="group flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-slate-900/50 dark:hover:bg-slate-800"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-110 dark:bg-slate-700">
                    <Sprout className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Add Plant</span>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Track lifecycle</p>
                  </div>
                </button>
                <button
                  onClick={() => setShowAddSpace(true)}
                  className="group flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-slate-900/50 dark:hover:bg-slate-800"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-110 dark:bg-slate-700">
                    <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Add Space</span>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Organize grow areas</p>
                  </div>
                </button>
                <button
                  onClick={() => setShowAddNote(true)}
                  className="group flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-slate-900/50 dark:hover:bg-slate-800"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-110 dark:bg-slate-700">
                    <StickyNote className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Add Note</span>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Log context or photos</p>
                  </div>
                </button>
                <button
                  onClick={() => setShowAddTask(true)}
                  className="group flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-slate-900/50 dark:hover:bg-slate-800"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-110 dark:bg-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Add Task</span>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Schedule care work</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Plant Stage Distribution */}
            <PlantStageDistribution plants={plants} isLoading={plantsLoading} />
          </div>
        </div>
      </div>

      {/* First-run onboarding modal */}
      <Dialog
        open={showOnboarding}
        onOpenChange={(open) => {
          if (!open) {
            dismissOnboarding();
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Welcome to Grospace</DialogTitle>
            <DialogDescription>
              Start with these three steps to set up your garden workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-700">
              <Building2 className="mx-auto mb-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium">Create a space</p>
              <p className="mt-1 text-xs text-muted-foreground">Set up tents, beds, or containers.</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-700">
              <Sprout className="mx-auto mb-2 h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium">Add your plants</p>
              <p className="mt-1 text-xs text-muted-foreground">Track status from seedling to harvest.</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-700">
              <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium">Plan key tasks</p>
              <p className="mt-1 text-xs text-muted-foreground">Stay on schedule with reminders.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={dismissOnboarding}>
              Skip
            </Button>
            <Button onClick={dismissOnboarding}>Let&apos;s grow</Button>
          </DialogFooter>
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

      {/* Quick Action Modals */}

      {/* Add Plant Modal */}
      <Dialog open={showAddPlant} onOpenChange={setShowAddPlant}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Plant</DialogTitle>
            <DialogDescription>Add a new plant to your garden.</DialogDescription>
          </DialogHeader>
          <PlantForm
            spaces={spaces}
            onSuccess={() => {
              setShowAddPlant(false);
              loadPlants();
            }}
            onCancel={() => setShowAddPlant(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Space Modal */}
      <Dialog open={showAddSpace} onOpenChange={setShowAddSpace}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Space</DialogTitle>
            <DialogDescription>Add a new grow space to organize your plants.</DialogDescription>
          </DialogHeader>
          <SpaceForm
            onSubmit={handleCreateSpace}
            onCancel={() => setShowAddSpace(false)}
            isLoading={spacesLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Schedule required care with a due date, priority, and optional recurrence. For open-ended observations or photo logs, use Add Note.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            spaces={spaces}
            plants={plants}
            onSubmit={async (taskData) => {
              try {
                await useTaskStore.getState().createTask(taskData);
                setShowAddTask(false);
                loadTasks();
              } catch (error) {
                console.error('Failed to create task:', error);
              }
            }}
            onCancel={() => setShowAddTask(false)}
            isLoading={false}
          />
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Use notes for searchable context and photo history. If this should happen later or repeat, create a task instead.</DialogDescription>
          </DialogHeader>
          <NoteForm
            onSubmit={async (data) => {
              await handleCreateNote(data);
            }}
            onCancel={() => setShowAddNote(false)}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}


