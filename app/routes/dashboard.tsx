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
import { format, differenceInDays } from 'date-fns';
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
import { isTaskDueSoon, isTaskNeedsAttention } from '~/lib/utils/taskStatus';
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
const ONBOARDING_STEPS = ['space', 'plant', 'task'] as const;

type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

type OnboardingStepsState = Record<OnboardingStep, boolean>;

interface OnboardingState {
  version: 1;
  steps: OnboardingStepsState;
  completed: boolean;
  dismissed: boolean;
  updatedAt: string;
  completedAt: string | null;
}

const createDefaultOnboardingState = (): OnboardingState => ({
  version: 1,
  steps: {
    space: false,
    plant: false,
    task: false,
  },
  completed: false,
  dismissed: false,
  updatedAt: new Date().toISOString(),
  completedAt: null,
});

const createCompletedOnboardingState = (): OnboardingState => ({
  version: 1,
  steps: {
    space: true,
    plant: true,
    task: true,
  },
  completed: true,
  dismissed: true,
  updatedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
});

const areAllOnboardingStepsDone = (steps: OnboardingStepsState) =>
  ONBOARDING_STEPS.every((step) => steps[step]);

const parseOnboardingState = (raw: string | null): OnboardingState => {
  if (!raw) {
    return createDefaultOnboardingState();
  }

  if (raw === 'seen') {
    return createCompletedOnboardingState();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    const base = createDefaultOnboardingState();
    const mergedSteps: OnboardingStepsState = {
      space: Boolean(parsed.steps?.space),
      plant: Boolean(parsed.steps?.plant),
      task: Boolean(parsed.steps?.task),
    };
    const inferredComplete = Boolean(parsed.completed) || areAllOnboardingStepsDone(mergedSteps);

    return {
      version: 1,
      steps: mergedSteps,
      completed: inferredComplete,
      dismissed: inferredComplete ? true : Boolean(parsed.dismissed),
      updatedAt:
        typeof parsed.updatedAt === 'string' && parsed.updatedAt.length > 0
          ? parsed.updatedAt
          : base.updatedAt,
      completedAt:
        inferredComplete && typeof parsed.completedAt === 'string'
          ? parsed.completedAt
          : inferredComplete
            ? base.updatedAt
            : null,
    };
  } catch {
    return createDefaultOnboardingState();
  }
};

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
  const { tasks, loadTasks, createTask, completeTask, loading: tasksLoading } = useTaskStore();
  const { notes, loadNotes, createNote, loading: notesLoading } = useNoteStore();

  // Quick Action modal states
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [hasAutoOpenedOnboarding, setHasAutoOpenedOnboarding] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [taskFormKey, setTaskFormKey] = useState(0);
  const [noteFormKey, setNoteFormKey] = useState(0);
  const [creatingTaskFromDashboard, setCreatingTaskFromDashboard] = useState(false);
  const [creatingNoteFromDashboard, setCreatingNoteFromDashboard] = useState(false);
  const [creatingSpaceFromDashboard, setCreatingSpaceFromDashboard] = useState(false);

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
      setOnboardingState(null);
      setHasAutoOpenedOnboarding(false);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const onboardingKey = `${ONBOARDING_STORAGE_KEY_PREFIX}:${user.uid}`;
    setOnboardingState(parseOnboardingState(window.localStorage.getItem(onboardingKey)));
    setHasAutoOpenedOnboarding(false);
  }, [user]);

  const currentUserId = user?.uid ?? null;

  const scopedSpaces = useMemo(
    () =>
      currentUserId
        ? spaces.filter((space) => !space.userId || space.userId === currentUserId)
        : [],
    [spaces, currentUserId]
  );
  const scopedPlants = useMemo(
    () =>
      currentUserId
        ? plants.filter((plant) => !plant.userId || plant.userId === currentUserId)
        : [],
    [plants, currentUserId]
  );
  const scopedTasks = useMemo(
    () =>
      currentUserId
        ? tasks.filter((task) => !task.userId || task.userId === currentUserId)
        : [],
    [tasks, currentUserId]
  );
  const scopedNotes = useMemo(
    () =>
      currentUserId
        ? notes.filter((note) => !note.userId || note.userId === currentUserId)
        : [],
    [notes, currentUserId]
  );

  const activePlants = scopedPlants.filter(
    (plant) => plant.status !== 'harvested' && plant.status !== 'removed'
  ).length;
  const harvestedPlants = scopedPlants.filter((plant) => plant.status === 'harvested').length;

  // "Open Issues" / Overdue pending tasks + high-priority tasks due in next 24h
  const openIssueTasks = useMemo(() => {
    const now = new Date();
    return scopedTasks.filter((task) => isTaskNeedsAttention(task, now));
  }, [scopedTasks]);

  const openIssuesCount = useMemo(
    () => new Set(openIssueTasks.map((task) => task.id)).size,
    [openIssueTasks]
  );

  // Tasks Due (Next 24 Hours)
  const tasksDueSoon = useMemo(() => {
    const now = new Date();
    return scopedTasks.filter((task) => isTaskDueSoon(task, now));
  }, [scopedTasks]);

  // Recent Activity with Description
  const activities = useMemo(() => {
    const rawActivities = activityService.generateActivities(
      scopedNotes,
      scopedTasks,
      scopedPlants,
      scopedSpaces,
      { limit: 5 }
    );
    return rawActivities.map((activity) => ({
      ...activity,
      description: activityService.formatActivityDescription(activity),
    }));
  }, [scopedNotes, scopedTasks, scopedPlants, scopedSpaces]);

  // Recent Tasks for the list
  const recentTasks = scopedTasks
    .filter((t) => t.status === 'pending')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const isLoading = spacesLoading || plantsLoading || tasksLoading || notesLoading;
  const showSetupGardenCta =
    !isLoading && scopedSpaces.length === 0 && scopedPlants.length === 0;

  useEffect(() => {
    if (!user || !onboardingState || typeof window === 'undefined') {
      return;
    }

    const inferredSteps: OnboardingStepsState = {
      space: scopedSpaces.length > 0,
      plant: scopedPlants.length > 0,
      task: scopedTasks.length > 0,
    };
    const mergedSteps: OnboardingStepsState = {
      space: onboardingState.steps.space || inferredSteps.space,
      plant: onboardingState.steps.plant || inferredSteps.plant,
      task: onboardingState.steps.task || inferredSteps.task,
    };
    const now = new Date().toISOString();
    const inferredComplete =
      onboardingState.completed || areAllOnboardingStepsDone(mergedSteps);
    const nextState: OnboardingState = {
      ...onboardingState,
      steps: mergedSteps,
      completed: inferredComplete,
      dismissed: inferredComplete ? true : onboardingState.dismissed,
      updatedAt: now,
      completedAt:
        inferredComplete
          ? onboardingState.completedAt || now
          : onboardingState.completedAt,
    };
    const changed =
      onboardingState.steps.space !== nextState.steps.space ||
      onboardingState.steps.plant !== nextState.steps.plant ||
      onboardingState.steps.task !== nextState.steps.task ||
      onboardingState.completed !== nextState.completed ||
      onboardingState.dismissed !== nextState.dismissed ||
      onboardingState.completedAt !== nextState.completedAt;

    if (changed) {
      const onboardingKey = `${ONBOARDING_STORAGE_KEY_PREFIX}:${user.uid}`;
      window.localStorage.setItem(onboardingKey, JSON.stringify(nextState));
      setOnboardingState(nextState);
      if (nextState.completed) {
        setShowOnboarding(false);
      }
      return;
    }

    if (!hasAutoOpenedOnboarding) {
      if (!nextState.completed && !nextState.dismissed) {
        setShowOnboarding(true);
      }
      setHasAutoOpenedOnboarding(true);
    }
  }, [
    user,
    onboardingState,
    scopedSpaces.length,
    scopedPlants.length,
    scopedTasks.length,
    hasAutoOpenedOnboarding,
  ]);

  const onboardingProgressCount = onboardingState
    ? ONBOARDING_STEPS.filter((step) => onboardingState.steps[step]).length
    : 0;
  const onboardingIsCompleted = onboardingState?.completed ?? false;
  const showResumeSetupCta =
    !isLoading &&
    !onboardingIsCompleted &&
    onboardingProgressCount > 0;

  const statTileClassName =
    'block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-gray-700 dark:bg-slate-800';

  const closeTaskQuickAction = () => {
    setShowAddTask(false);
    setTaskFormKey((value) => value + 1);
  };

  const closeNoteQuickAction = () => {
    setShowAddNote(false);
    setNoteFormKey((value) => value + 1);
  };

  const persistOnboardingState = (nextState: OnboardingState) => {
    if (typeof window !== 'undefined' && user) {
      const onboardingKey = `${ONBOARDING_STORAGE_KEY_PREFIX}:${user.uid}`;
      window.localStorage.setItem(onboardingKey, JSON.stringify(nextState));
    }
    setOnboardingState(nextState);
  };

  const markOnboardingStepCompleted = (step: OnboardingStep) => {
    if (!onboardingState) {
      return;
    }

    const nextSteps: OnboardingStepsState = {
      ...onboardingState.steps,
      [step]: true,
    };
    const now = new Date().toISOString();
    const isComplete = areAllOnboardingStepsDone(nextSteps);

    const nextState: OnboardingState = {
      ...onboardingState,
      steps: nextSteps,
      completed: isComplete,
      dismissed: isComplete ? true : onboardingState.dismissed,
      updatedAt: now,
      completedAt: isComplete ? onboardingState.completedAt || now : onboardingState.completedAt,
    };

    persistOnboardingState(nextState);
    if (isComplete) {
      setShowOnboarding(false);
    }
  };

  const dismissOnboarding = () => {
    if (!onboardingState) {
      setShowOnboarding(false);
      return;
    }

    const nextState: OnboardingState = {
      ...onboardingState,
      dismissed: true,
      updatedAt: new Date().toISOString(),
    };

    persistOnboardingState(nextState);
    setShowOnboarding(false);
  };

  const completeOnboarding = () => {
    const now = new Date().toISOString();
    const nextState: OnboardingState = {
      version: 1,
      steps: {
        space: true,
        plant: true,
        task: true,
      },
      completed: true,
      dismissed: true,
      updatedAt: now,
      completedAt: now,
    };

    persistOnboardingState(nextState);
    setShowOnboarding(false);
  };

  const openOnboarding = () => {
    if (onboardingState && onboardingState.dismissed && !onboardingState.completed) {
      persistOnboardingState({
        ...onboardingState,
        dismissed: false,
        updatedAt: new Date().toISOString(),
      });
    }
    setShowOnboarding(true);
  };

  const startOnboardingStep = (step: OnboardingStep) => {
    setShowOnboarding(false);

    if (step === 'space') {
      setShowAddSpace(true);
      return;
    }

    if (step === 'plant') {
      setShowAddPlant(true);
      return;
    }

    setShowAddTask(true);
  };

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
    const task = scopedTasks.find((item) => item.id === taskId);
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
    if (!user || creatingSpaceFromDashboard) return;
    setCreatingSpaceFromDashboard(true);
    try {
      await createSpace({ ...data, userId: user.uid });
      markOnboardingStepCompleted('space');
      setShowAddSpace(false);
    } catch (error) {
      console.error('Failed to create space:', error);
    } finally {
      setCreatingSpaceFromDashboard(false);
    }
  };

  const handleCreateNote = async (data: any) => {
    if (!user || creatingNoteFromDashboard) return;
    setCreatingNoteFromDashboard(true);
    try {
      await createNote(data, user.uid);
      closeNoteQuickAction();
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setCreatingNoteFromDashboard(false);
    }
  };

  // Loading skeleton
  if (isLoading && scopedPlants.length === 0 && scopedTasks.length === 0) {
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
      <div className="flex-1 space-y-8" data-testid="e2e-dashboard-root">
        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Active Plants */}
          <Link
            to="/plants?status=active"
            className={statTileClassName}
            data-testid="e2e-dashboard-stat-active-plants"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Plants</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{activePlants}</p>
                <p className="mt-1 flex items-center text-xs font-medium text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />+
                  {scopedPlants.filter((p) => differenceInDays(new Date(), new Date(p.plantedDate)) <= 7).length} this week
                </p>
              </div>
              <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                <Sprout className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Link>

          {/* Open Issues (Overdue + high-priority due in next 24h) */}
          <Link
            to="/events?type=tasks&taskStatus=issues"
            className={statTileClassName}
            data-testid="e2e-dashboard-stat-open-issues"
          >
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
          <Link
            to="/events?type=tasks&taskStatus=dueSoon"
            className={statTileClassName}
            data-testid="e2e-dashboard-stat-tasks-due"
          >
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
          <Link
            to="/plants?status=harvested"
            className={statTileClassName}
            data-testid="e2e-dashboard-stat-total-harvests"
          >
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

        {showSetupGardenCta && (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-6 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-blue-950/40">
            <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-200/60 blur-2xl dark:bg-emerald-500/20" />
            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  New Garden Setup
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  Set up your first grow space
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Start with one space, then add plants, tasks, and notes as your cycle progresses.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowAddSpace(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Set Up Garden
              </Button>
                <Button variant="outline" onClick={openOnboarding}>
                  View Setup Steps
                </Button>
              </div>
            </div>
          </div>
        )}

        {showResumeSetupCta && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  Resume setup walkthrough
                </p>
                <p className="text-sm text-blue-800/80 dark:text-blue-300/90">
                  {onboardingProgressCount} of {ONBOARDING_STEPS.length} setup steps completed.
                </p>
              </div>
              <Button variant="outline" onClick={openOnboarding}>
                Resume Setup
              </Button>
            </div>
          </div>
        )}

        {/* Main Content Areas */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column (8 cols) */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            {/* Priority/Upcoming Tasks */}
            <div
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-800"
              data-testid="e2e-dashboard-upcoming-tasks"
            >
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-slate-900/50">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Upcoming Tasks</h3>
                <Link to="/events?type=tasks" className="text-sm font-medium text-primary hover:text-primary/80">
                  View All
                </Link>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentTasks.length > 0 ? (
                  recentTasks.map((task) => {
                    const associatedPlant = task.plantId
                      ? scopedPlants.find((plant) => plant.id === task.plantId)
                      : null;
                    const associatedSpace = task.spaceId
                      ? scopedSpaces.find((space) => space.id === task.spaceId)
                      : null;

                    return (
                      <div
                        key={task.id}
                        data-testid={`e2e-dashboard-task-row-${task.id}`}
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
                          data-testid={`e2e-dashboard-task-complete-${task.id}`}
                        >
                          Mark Complete
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8">
                    <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/70 p-6 text-center dark:border-blue-900/60 dark:bg-blue-950/30">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-300">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <h4
                        className="text-base font-semibold text-slate-900 dark:text-white"
                        data-testid="e2e-dashboard-empty-upcoming"
                      >
                        No upcoming tasks yet
                      </h4>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Add your first scheduled care task so this section can keep your next steps visible.
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => setShowAddTask(true)}
                          data-testid="e2e-dashboard-empty-create-task"
                        >
                          Create First Task
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/events?type=tasks">Open Events Tasks</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div
              className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-800"
              data-testid="e2e-dashboard-recent-activity"
            >
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-slate-900/50">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Activity</h3>
              </div>
              <div className="p-6">
                {activities.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/70 p-6 text-center dark:border-emerald-900/60 dark:bg-emerald-950/20">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <h4
                      className="text-base font-semibold text-slate-900 dark:text-white"
                      data-testid="e2e-dashboard-empty-activity"
                    >
                      Activity timeline is empty
                    </h4>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Complete a task or log a note and your recent activity feed will populate automatically.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button size="sm" onClick={() => setShowAddNote(true)}>
                        Add Note
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/events?type=tasks">View Tasks</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
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
                  </ol>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) */}
          <div className="flex flex-col gap-8 lg:col-span-4">
                        {/* Quick Actions */}
            <div
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-slate-800"
              data-testid="e2e-dashboard-quick-actions"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Quick Actions</h3>
                <FeatureHelpPopover
                  label="Quick action help"
                  title="Events includes notes and tasks"
                  description="Events keeps both workflows together while preserving their distinct purpose."
                  items={[
                    'Use notes for observations, context, and photo records.',
                    'Use tasks for scheduled work with due dates and recurrence.',
                    'Complete a task with a linked note when you want outcome history.',
                  ]}
                />
              </div>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Events combines notes and tasks. Notes log what happened, and tasks schedule what happens next.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowAddPlant(true)}
                  data-testid="e2e-dashboard-qa-add-plant"
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
                  data-testid="e2e-dashboard-qa-add-space"
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
                  data-testid="e2e-dashboard-qa-add-note"
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
                  data-testid="e2e-dashboard-qa-add-task"
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
            <div data-testid="e2e-dashboard-plant-stages">
              <PlantStageDistribution plants={scopedPlants} isLoading={plantsLoading} />
            </div>
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
        <DialogContent className="sm:max-w-[560px]" data-testid="e2e-dashboard-onboarding-dialog">
          <DialogHeader>
            <DialogTitle>Welcome to Grospace</DialogTitle>
            <DialogDescription>
              Follow this guided setup to get your dashboard fully operational.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Step 1: Create a space
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Set up tents, beds, or containers.</p>
                </div>
                {onboardingState?.steps.space ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Done
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startOnboardingStep('space')}>
                    Create Space
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Step 2: Add your plants
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Track status from seedling to harvest.
                  </p>
                </div>
                {onboardingState?.steps.plant ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Done
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startOnboardingStep('plant')}
                    disabled={scopedSpaces.length === 0}
                  >
                    Add Plant
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Step 3: Plan key tasks
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Schedule recurring and one-off care work.</p>
                </div>
                {onboardingState?.steps.task ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Done
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startOnboardingStep('task')}>
                    Add Task
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={dismissOnboarding}
              data-testid="e2e-dashboard-onboarding-close"
            >
              Close For Now
            </Button>
            <Button onClick={completeOnboarding} data-testid="e2e-dashboard-onboarding-complete">
              Complete setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Completion Dialog */}
      <TaskCompletionDialog
        task={completingTask}
        spaces={scopedSpaces}
        plants={scopedPlants}
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
            spaces={scopedSpaces}
            onSuccess={() => {
              setShowAddPlant(false);
              markOnboardingStepCompleted('plant');
              loadPlants();
            }}
            onCancel={() => setShowAddPlant(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Space Modal */}
      <Dialog
        open={showAddSpace}
        onOpenChange={(open) => {
          if (!open && creatingSpaceFromDashboard) {
            return;
          }
          setShowAddSpace(open);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Space</DialogTitle>
            <DialogDescription>Add a new grow space to organize your plants.</DialogDescription>
          </DialogHeader>
          <SpaceForm
            onSubmit={handleCreateSpace}
            onCancel={() => setShowAddSpace(false)}
            isLoading={creatingSpaceFromDashboard || spacesLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog
        open={showAddTask}
        onOpenChange={(open) => {
          if (!open && creatingTaskFromDashboard) {
            return;
          }
          if (!open) {
            closeTaskQuickAction();
            return;
          }
          setShowAddTask(true);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Schedule required care with a due date, priority, and optional recurrence. For open-ended observations or photo logs, use Add Note.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            key={taskFormKey}
            spaces={scopedSpaces}
            plants={scopedPlants}
            onSubmit={async (taskData) => {
              if (creatingTaskFromDashboard) {
                return;
              }

              setCreatingTaskFromDashboard(true);
              try {
                await createTask(taskData);
                markOnboardingStepCompleted('task');
                closeTaskQuickAction();
                await loadTasks();
              } catch (error) {
                console.error('Failed to create task:', error);
              } finally {
                setCreatingTaskFromDashboard(false);
              }
            }}
            onCancel={closeTaskQuickAction}
            isLoading={creatingTaskFromDashboard}
          />
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog
        open={showAddNote}
        onOpenChange={(open) => {
          if (!open && creatingNoteFromDashboard) {
            return;
          }
          if (!open) {
            closeNoteQuickAction();
            return;
          }
          setShowAddNote(true);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Use notes for searchable context and photo history. If this should happen later or repeat, create a task instead.</DialogDescription>
          </DialogHeader>
          <NoteForm
            key={noteFormKey}
            onSubmit={async (data) => {
              await handleCreateNote(data);
            }}
            onCancel={closeNoteQuickAction}
            loading={creatingNoteFromDashboard}
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
