import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Image as ImageIcon,
  Leaf,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  Search,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { format, formatDistanceToNow, startOfDay } from 'date-fns';
import { toast } from 'sonner';

import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { NoteForm } from '../components/notes/NoteForm';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { TaskCompletionDialog } from '../components/tasks/TaskCompletionDialog';
import { TaskForm } from '../components/tasks/TaskForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';

import { useNoteStore } from '../stores/noteStore';
import { useTaskStore } from '../stores/taskStore';
import { useSpaceStore } from '../stores/spaceStore';
import { usePlantStore } from '../stores/plantStore';
import { useAuthStore } from '../stores/authStore';

import type { GrowSpace, Plant, Task, TaskPriority } from '../lib/types';
import {
  NOTE_CATEGORIES,
  type Note,
  type NoteCategory,
} from '../lib/types/note';

type EventsView = 'notes' | 'tasks';
type TaskStatusFilter =
  | 'all'
  | 'pending'
  | 'issues'
  | 'dueSoon'
  | 'overdue'
  | 'completed';
type TaskContextFilter = 'all' | 'plants' | 'spaces';
type TaskScopeFilter = 'all' | 'unlinked';
type TaskGroupBy = 'none' | 'dueDate';
type NoteCategoryFilter = NoteCategory | 'all';
type NoteContextFilter = 'all' | 'plants' | 'spaces';
type NoteScopeFilter = 'all' | 'unlinked';

const parseEventsView = (value: string | null): EventsView =>
  value === 'notes' ? 'notes' : 'tasks';

const parseTaskStatusFilter = (value: string | null): TaskStatusFilter => {
  if (
    value === 'pending' ||
    value === 'issues' ||
    value === 'dueSoon' ||
    value === 'overdue' ||
    value === 'completed'
  ) {
    return value;
  }

  return 'all';
};

const parseTaskContextFilter = (
  value: string | null,
  taskSpaceFilter: string,
  taskPlantFilter: string
): TaskContextFilter => {
  if (value === 'plants' || value === 'spaces' || value === 'all') {
    return value;
  }

  if (taskPlantFilter !== 'all' && taskSpaceFilter === 'all') {
    return 'plants';
  }

  if (taskSpaceFilter !== 'all' && taskPlantFilter === 'all') {
    return 'spaces';
  }

  return 'all';
};

const parseTaskScopeFilter = (value: string | null): TaskScopeFilter =>
  value === 'unlinked' ? 'unlinked' : 'all';

const parseTaskPriorityFilter = (
  value: string | null
): TaskPriority | 'all' => {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }

  return 'all';
};

const parseTaskGroupBy = (value: string | null): TaskGroupBy => {
  if (value === 'dueDate') {
    return value;
  }

  return 'none';
};

const parseContextEntityFilter = (value: string | null) =>
  value && value.trim() ? value : 'all';

const parseNoteCategoryFilter = (value: string | null): NoteCategoryFilter => {
  if (value === 'all' || value === null) {
    return 'all';
  }

  if (NOTE_CATEGORIES.some((category) => category.value === value)) {
    return value as NoteCategory;
  }

  return 'all';
};

const parseNoteContextFilter = (
  value: string | null,
  noteSpaceFilter: string,
  notePlantFilter: string
): NoteContextFilter => {
  if (value === 'plants' || value === 'spaces' || value === 'all') {
    return value;
  }

  if (notePlantFilter !== 'all' && notePlantFilter !== 'none') {
    return 'plants';
  }

  if (noteSpaceFilter !== 'all' && noteSpaceFilter !== 'none') {
    return 'spaces';
  }

  return 'all';
};

const isSmallViewport = () =>
  typeof window !== 'undefined' && window.innerWidth < 1024;

const formatDate = (date: Date) => format(date, 'MMM d, yyyy');
const formatDateTime = (date?: Date) =>
  date ? format(date, 'MMM d, yyyy h:mm a') : 'Not available';
const notesHelperCopy =
  'Use notes for observations, issues, milestones, photo updates, and other context you may want to find later. Use tasks for work that needs a due date or repeat schedule.';
const tasksHelperCopy =
  'Use Filters for smart status views: Issues shows pending high-priority or overdue tasks, and Due Soon shows pending tasks due today or tomorrow.';

const isTaskOverdue = (task: Task) => {
  if (task.status === 'completed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return task.dueDate < today;
};

const getTaskStatusCopy = (task: Task) => {
  if (task.status === 'completed') {
    return {
      label: 'Completed',
      textClassName: 'text-emerald-400',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    };
  }

  if (isTaskOverdue(task)) {
    return {
      label: 'Overdue',
      textClassName: 'text-amber-400',
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    };
  }

  return {
    label: 'Pending',
    textClassName: 'text-slate-300',
    icon: <Circle className="h-4 w-4 text-slate-500" />,
  };
};

const getTaskPriorityClassName = (priority: TaskPriority) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500/20 text-red-400 hover:bg-red-500/30';
    case 'medium':
      return 'bg-amber-400/20 text-amber-400 hover:bg-amber-400/30';
    case 'low':
      return 'bg-blue-400/20 text-blue-400 hover:bg-blue-400/30';
    default:
      return 'bg-slate-700 text-slate-200';
  }
};

const getTaskPrioritySolidClassName = (priority: TaskPriority) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500 text-slate-950 hover:bg-red-400';
    case 'medium':
      return 'bg-amber-400 text-slate-950 hover:bg-amber-300';
    case 'low':
      return 'bg-blue-400 text-slate-950 hover:bg-blue-300';
    default:
      return 'bg-slate-700 text-slate-200';
  }
};

const getNoteCategoryLabel = (category: NoteCategory) =>
  NOTE_CATEGORIES.find((item) => item.value === category)?.label ?? category;

const getNoteCategoryClassName = (category: NoteCategory) => {
  switch (category) {
    case 'observation':
      return 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30';
    case 'feeding':
      return 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30';
    case 'pruning':
      return 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30';
    case 'issue':
      return 'bg-red-500/20 text-red-300 hover:bg-red-500/30';
    case 'milestone':
      return 'bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/30';
    default:
      return 'bg-slate-500/20 text-slate-300 hover:bg-slate-500/30';
  }
};

const formatRecurrence = (task: Task) => {
  if (!task.recurrence) {
    return 'Does not repeat';
  }

  const unit =
    task.recurrence.type === 'daily'
      ? 'day'
      : task.recurrence.type === 'weekly'
        ? 'week'
        : 'month';
  const intervalText = `${task.recurrence.interval} ${unit}${task.recurrence.interval === 1 ? '' : 's'}`;
  const endDateText = task.recurrence.endDate
    ? ` until ${formatDate(task.recurrence.endDate)}`
    : '';

  return `Every ${intervalText}${endDateText}`;
};

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-slate-500">{label}</h4>
      <div className="text-slate-200">{children}</div>
    </div>
  );
}

function EmptyDetailState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 rounded-full border border-slate-800 bg-slate-900/70 p-4 text-slate-400">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-slate-200">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}
function TaskDetailsContent({
  task,
  spaces,
  plants,
  onMarkComplete,
  onEdit,
  onDelete,
  onClose,
}: {
  task: Task | null;
  spaces: GrowSpace[];
  plants: Plant[];
  onMarkComplete?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onClose?: () => void;
}) {
  if (!task) {
    return (
      <EmptyDetailState
        title="Select a task"
        description="Choose a task from the list to inspect its full schedule, context, and metadata."
        icon={<Circle className="h-6 w-6" />}
      />
    );
  }

  const status = getTaskStatusCopy(task);
  const plant = task.plantId
    ? plants.find((item) => item.id === task.plantId)
    : undefined;
  const space = task.spaceId
    ? spaces.find((item) => item.id === task.spaceId)
    : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 flex justify-end gap-2">
        {onEdit && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onEdit(task)}
            aria-label="Edit task"
            className="rounded-lg border-transparent bg-[#1e293b] text-slate-400 hover:bg-[#243247] hover:text-white"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDelete(task)}
            aria-label="Delete task"
            className="rounded-lg border-transparent bg-[#1e293b] text-slate-400 hover:bg-[#243247] hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {onClose && (
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="rounded-lg border-transparent bg-[#1e293b] text-slate-400 hover:bg-[#243247] hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="max-w-2xl">
        <h2 className="mb-6 text-3xl font-bold text-white">{task.title}</h2>

        {task.status === 'pending' && onMarkComplete && (
          <Button
            onClick={() => onMarkComplete(task)}
            className="mb-6 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark complete
          </Button>
        )}

        <p
          className={`mb-8 text-lg leading-relaxed ${task.description ? 'text-slate-300' : 'text-slate-500'}`}
        >
          {task.description || 'No description provided.'}
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <DetailField label="Due date">{formatDate(task.dueDate)}</DetailField>

          <DetailField label="Status">
            <div className="flex items-center gap-2">
              {status.icon}
              <span className={`font-medium ${status.textClassName}`}>
                {status.label}
              </span>
            </div>
          </DetailField>

          <DetailField label="Completed on">
            <span
              className={task.completedAt ? 'text-slate-200' : 'text-slate-500'}
            >
              {task.completedAt
                ? formatDateTime(task.completedAt)
                : 'Not completed yet'}
            </span>
          </DetailField>

          <DetailField label="Priority">
            <Badge
              variant="secondary"
              className={`border-transparent px-3 font-medium capitalize ${getTaskPrioritySolidClassName(task.priority)}`}
            >
              {task.priority}
            </Badge>
          </DetailField>

          <DetailField label="Recurrence">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-slate-500" />
              <span
                className={
                  task.recurrence ? 'text-slate-200' : 'text-slate-500'
                }
              >
                {formatRecurrence(task)}
              </span>
            </div>
          </DetailField>

          <DetailField label="Plant">
            {plant ? (
              <Badge
                variant="outline"
                className="border-transparent bg-emerald-900/60 px-3 py-1 font-medium text-emerald-300"
              >
                {plant.variety
                  ? `${plant.name} (${plant.variety})`
                  : plant.name}
              </Badge>
            ) : (
              <span className="text-slate-500">No plant attached</span>
            )}
          </DetailField>

          <DetailField label="Space">
            {space ? (
              <Badge
                variant="outline"
                className="border-transparent bg-blue-900/60 px-3 py-1 font-medium text-blue-300"
              >
                {space.name}
              </Badge>
            ) : (
              <span className="text-slate-500">No space attached</span>
            )}
          </DetailField>

          <DetailField label="Created">
            {formatDateTime(task.createdAt)}
          </DetailField>

          <DetailField label="Updated">
            {formatDateTime(task.updatedAt)}
          </DetailField>
        </div>
      </div>

    </div>
  );
}
function NoteDetailsContent({
  note,
  spaces,
  plants,
  onEdit,
  onDelete,
  onOpenPhoto,
  onClose,
}: {
  note: Note | null;
  spaces: GrowSpace[];
  plants: Plant[];
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onOpenPhoto: (photoUrl: string) => void;
  onClose?: () => void;
}) {
  if (!note) {
    return (
      <EmptyDetailState
        title="Select a note"
        description="Choose a note to review the full entry, its photos, and the plant or space it belongs to."
        icon={<StickyNote className="h-6 w-6" />}
      />
    );
  }

  const plant = note.plantId
    ? plants.find((item) => item.id === note.plantId)
    : undefined;
  const space = note.spaceId
    ? spaces.find((item) => item.id === note.spaceId)
    : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 flex justify-end gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onEdit(note)}
          aria-label="Edit note"
          className="rounded-lg border-transparent bg-[#1e293b] text-slate-400 hover:bg-[#243247] hover:text-white"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onDelete(note)}
          aria-label="Delete note"
          className="rounded-lg border-transparent bg-[#1e293b] text-slate-400 hover:bg-[#243247] hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        {onClose && (
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="Close note details"
            className="rounded-lg border-transparent bg-[#1e293b] text-slate-400 hover:bg-[#243247] hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Badge
            variant="secondary"
            className={`border-transparent px-3 py-1 font-medium ${getNoteCategoryClassName(note.category)}`}
          >
            {getNoteCategoryLabel(note.category)}
          </Badge>
          <span className="text-sm text-slate-500">
            {formatDateTime(note.timestamp)}
          </span>
          <span className="text-sm text-slate-600" aria-hidden="true">
            &bull;
          </span>
          <span className="text-sm text-slate-500">
            {formatDistanceToNow(note.timestamp, { addSuffix: true })}
          </span>
        </div>

        <h2 className="mb-6 text-3xl font-bold text-white">
          {getNoteCategoryLabel(note.category)} note
        </h2>

        <div className="mb-8 whitespace-pre-wrap text-lg leading-relaxed text-slate-200">
          {note.content}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <DetailField label="Logged at">
            {formatDateTime(note.timestamp)}
          </DetailField>

          <DetailField label="Category">
            <Badge
              variant="secondary"
              className={`border-transparent px-3 py-1 font-medium ${getNoteCategoryClassName(note.category)}`}
            >
              {getNoteCategoryLabel(note.category)}
            </Badge>
          </DetailField>

          <DetailField label="Plant">
            {plant ? (
              <Badge
                variant="outline"
                className="border-transparent bg-emerald-900/60 px-3 py-1 font-medium text-emerald-300"
              >
                {plant.variety
                  ? `${plant.name} (${plant.variety})`
                  : plant.name}
              </Badge>
            ) : (
              <span className="text-slate-500">No plant attached</span>
            )}
          </DetailField>

          <DetailField label="Space">
            {space ? (
              <Badge
                variant="outline"
                className="border-transparent bg-blue-900/60 px-3 py-1 font-medium text-blue-300"
              >
                {space.name}
              </Badge>
            ) : (
              <span className="text-slate-500">No space attached</span>
            )}
          </DetailField>

          <DetailField label="Created">
            {formatDateTime(note.createdAt)}
          </DetailField>

          <DetailField label="Updated">
            {formatDateTime(note.updatedAt)}
          </DetailField>
        </div>

        <div className="mt-10">
          <h4 className="mb-3 text-sm font-medium text-slate-500">Photos</h4>
          {note.photos.length === 0 ? (
            <p className="text-slate-500">No photos attached</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {note.photos.map((photo, index) => (
                <button
                  key={`${note.id}-photo-${index}`}
                  onClick={() => onOpenPhoto(photo)}
                  className="aspect-square overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 transition-opacity hover:opacity-85"
                >
                  <img
                    src={photo}
                    alt={`Note photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function meta() {
  return [
    { title: 'Events - Grospace' },
    {
      name: 'description',
      content:
        'Manage notes and scheduled tasks together in one Events workspace',
    },
  ];
}

function EventsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = parseEventsView(searchParams.get('type'));

  const taskSpaceFilter = parseContextEntityFilter(searchParams.get('taskSpaceId'));
  const taskPlantFilter = parseContextEntityFilter(searchParams.get('taskPlantId'));
  const taskContextFilter = parseTaskContextFilter(
    searchParams.get('taskContext'),
    taskSpaceFilter,
    taskPlantFilter
  );
  const taskScopeFilter: TaskScopeFilter =
    taskContextFilter === 'all'
      ? parseTaskScopeFilter(searchParams.get('taskScope'))
      : 'all';
  const taskStatusFilter = parseTaskStatusFilter(searchParams.get('taskStatus'));
  const taskPriorityFilter = parseTaskPriorityFilter(
    searchParams.get('taskPriority')
  );
  const taskGroupBy = parseTaskGroupBy(searchParams.get('taskGroupBy'));

  const effectiveTaskSpaceFilter =
    taskContextFilter === 'plants' ? 'all' : taskSpaceFilter;
  const effectiveTaskPlantFilter =
    taskContextFilter === 'spaces' ? 'all' : taskPlantFilter;

  const noteCategoryFilter = parseNoteCategoryFilter(searchParams.get('category'));
  const noteSpaceFilter = parseContextEntityFilter(searchParams.get('spaceId'));
  const notePlantFilter = parseContextEntityFilter(searchParams.get('plantId'));
  const noteContextFilter = parseNoteContextFilter(
    searchParams.get('noteContext'),
    noteSpaceFilter,
    notePlantFilter
  );
  const noteScopeFilter: NoteScopeFilter =
    noteContextFilter === 'all' &&
    noteSpaceFilter === 'none' &&
    notePlantFilter === 'none'
      ? 'unlinked'
      : 'all';

  const effectiveNoteSpaceFilter =
    noteContextFilter === 'plants' ? 'all' : noteSpaceFilter;
  const effectiveNotePlantFilter =
    noteContextFilter === 'spaces' ? 'all' : notePlantFilter;

  const { user } = useAuthStore();
  const {
    tasks,
    loadTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    loading: tasksLoading,
    error: taskError,
    clearError: clearTaskError,
  } = useTaskStore();
  const {
    notes,
    loadNotes,
    loading: notesLoading,
    error: noteError,
    createNote,
    updateNote,
    deleteNote,
    clearError: clearNoteError,
  } = useNoteStore();
  const { spaces, loadSpaces } = useSpaceStore();
  const { plants, loadPlants } = usePlantStore();

  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const [taskFormLoading, setTaskFormLoading] = useState(false);

  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [createNoteOpen, setCreateNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<Note | null>(null);
  const [noteFormLoading, setNoteFormLoading] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const taskAutoSelectedRef = useRef(false);
  const noteAutoSelectedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    loadTasks();
    loadSpaces();
    loadPlants();
  }, [user, loadTasks, loadSpaces, loadPlants]);

  useEffect(() => {
    if (!user) return;

    loadNotes(user.uid, {
      spaceId:
        effectiveNoteSpaceFilter !== 'all' && effectiveNoteSpaceFilter !== 'none'
          ? effectiveNoteSpaceFilter
          : undefined,
      plantId:
        effectiveNotePlantFilter !== 'all' && effectiveNotePlantFilter !== 'none'
          ? effectiveNotePlantFilter
          : undefined,
    });
  }, [user, loadNotes, effectiveNotePlantFilter, effectiveNoteSpaceFilter]);

  useEffect(() => {
    return () => {
      clearTaskError();
      clearNoteError();
    };
  }, [clearTaskError, clearNoteError]);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    });

    if (!nextParams.get('type')) {
      nextParams.set('type', activeView);
    }

    setSearchParams(nextParams);
  };

  const handleViewChange = (view: EventsView) => {
    updateSearchParams({ type: view });
  };

  const handleTaskContextChange = (nextContext: TaskContextFilter) => {
    if (nextContext === 'plants') {
      updateSearchParams({
        taskContext: 'plants',
        taskScope: null,
        taskSpaceId: null,
        taskPlantId: taskPlantFilter === 'all' ? null : taskPlantFilter,
      });
      return;
    }

    if (nextContext === 'spaces') {
      updateSearchParams({
        taskContext: 'spaces',
        taskScope: null,
        taskPlantId: null,
        taskSpaceId: taskSpaceFilter === 'all' ? null : taskSpaceFilter,
      });
      return;
    }

    updateSearchParams({
      taskContext: 'all',
      taskScope: null,
      taskSpaceId: null,
      taskPlantId: null,
    });
  };

  const handleTaskScopeChange = (nextScope: TaskScopeFilter) => {
    if (nextScope === 'unlinked') {
      updateSearchParams({
        taskContext: 'all',
        taskScope: 'unlinked',
        taskSpaceId: null,
        taskPlantId: null,
      });
      return;
    }

    updateSearchParams({
      taskContext: 'all',
      taskScope: null,
      taskSpaceId: null,
      taskPlantId: null,
    });
  };

  const handleNoteContextChange = (nextContext: NoteContextFilter) => {
    if (nextContext === 'plants') {
      updateSearchParams({
        noteContext: 'plants',
        spaceId: null,
        plantId: notePlantFilter === 'none' ? null : notePlantFilter,
      });
      return;
    }

    if (nextContext === 'spaces') {
      updateSearchParams({
        noteContext: 'spaces',
        plantId: null,
        spaceId: noteSpaceFilter === 'none' ? null : noteSpaceFilter,
      });
      return;
    }

    updateSearchParams({
      noteContext: 'all',
      spaceId: null,
      plantId: null,
    });
  };

  const handleNoteScopeChange = (nextScope: NoteScopeFilter) => {
    if (nextScope === 'unlinked') {
      updateSearchParams({
        noteContext: 'all',
        spaceId: 'none',
        plantId: 'none',
      });
      return;
    }

    updateSearchParams({
      noteContext: 'all',
      spaceId: null,
      plantId: null,
    });
  };

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    if (taskContextFilter === 'plants') {
      filtered = filtered.filter((task) => Boolean(task.plantId));
    }

    if (taskContextFilter === 'spaces') {
      filtered = filtered.filter((task) => Boolean(task.spaceId));
    }

    if (taskContextFilter === 'all' && taskScopeFilter === 'unlinked') {
      filtered = filtered.filter((task) => !task.plantId && !task.spaceId);
    }

    const today = startOfDay(new Date());
    const dueSoonWindowEnd = new Date(today);
    dueSoonWindowEnd.setDate(dueSoonWindowEnd.getDate() + 1);

    switch (taskStatusFilter) {
      case 'pending':
        filtered = filtered.filter((task) => task.status === 'pending');
        break;
      case 'issues':
        filtered = filtered.filter(
          (task) =>
            task.status === 'pending' &&
            (task.priority === 'high' || task.dueDate < today)
        );
        break;
      case 'dueSoon':
        filtered = filtered.filter(
          (task) =>
            task.status === 'pending' &&
            task.dueDate >= today &&
            task.dueDate <= dueSoonWindowEnd
        );
        break;
      case 'overdue':
        filtered = filtered.filter(
          (task) => task.status === 'pending' && task.dueDate < today
        );
        break;
      case 'completed':
        filtered = filtered.filter((task) => task.status === 'completed');
        break;
      default:
        break;
    }

    if (taskPriorityFilter !== 'all') {
      filtered = filtered.filter((task) => task.priority === taskPriorityFilter);
    }

    if (effectiveTaskSpaceFilter !== 'all') {
      filtered = filtered.filter((task) => task.spaceId === effectiveTaskSpaceFilter);
    }

    if (effectiveTaskPlantFilter !== 'all') {
      filtered = filtered.filter((task) => task.plantId === effectiveTaskPlantFilter);
    }

    if (taskSearchQuery.trim()) {
      const query = taskSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return filtered;
  }, [
    tasks,
    taskContextFilter,
    taskScopeFilter,
    taskStatusFilter,
    taskPriorityFilter,
    effectiveTaskSpaceFilter,
    effectiveTaskPlantFilter,
    taskSearchQuery,
  ]);

  const taskContextCounts = useMemo(
    () => ({
      all: tasks.length,
      plants: tasks.filter((task) => Boolean(task.plantId)).length,
      spaces: tasks.filter((task) => Boolean(task.spaceId)).length,
    }),
    [tasks]
  );

  const taskStatusCounts = useMemo(() => {
    let filtered = [...tasks];

    if (taskContextFilter === 'plants') {
      filtered = filtered.filter((task) => Boolean(task.plantId));
    }

    if (taskContextFilter === 'spaces') {
      filtered = filtered.filter((task) => Boolean(task.spaceId));
    }

    if (taskContextFilter === 'all' && taskScopeFilter === 'unlinked') {
      filtered = filtered.filter((task) => !task.plantId && !task.spaceId);
    }

    if (taskPriorityFilter !== 'all') {
      filtered = filtered.filter((task) => task.priority === taskPriorityFilter);
    }

    if (effectiveTaskSpaceFilter !== 'all') {
      filtered = filtered.filter((task) => task.spaceId === effectiveTaskSpaceFilter);
    }

    if (effectiveTaskPlantFilter !== 'all') {
      filtered = filtered.filter((task) => task.plantId === effectiveTaskPlantFilter);
    }

    const today = startOfDay(new Date());
    const dueSoonWindowEnd = new Date(today);
    dueSoonWindowEnd.setDate(dueSoonWindowEnd.getDate() + 1);

    return {
      all: filtered.length,
      pending: filtered.filter((task) => task.status === 'pending').length,
      completed: filtered.filter((task) => task.status === 'completed').length,
      issues: filtered.filter(
        (task) =>
          task.status === 'pending' &&
          (task.priority === 'high' || task.dueDate < today)
      ).length,
      dueSoon: filtered.filter(
        (task) =>
          task.status === 'pending' &&
          task.dueDate >= today &&
          task.dueDate <= dueSoonWindowEnd
      ).length,
      overdue: filtered.filter(
        (task) => task.status === 'pending' && task.dueDate < today
      ).length,
    };
  }, [
    tasks,
    taskContextFilter,
    taskScopeFilter,
    taskPriorityFilter,
    effectiveTaskSpaceFilter,
    effectiveTaskPlantFilter,
  ]);

  const groupedTasks = useMemo(() => {
    if (taskGroupBy === 'none') {
      return [{ title: 'All Tasks', tasks: filteredTasks }];
    }

    const groups = new Map<string, Task[]>();
    const groupOrder = new Map<string, number>();
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    filteredTasks.forEach((task) => {
      let groupTitle = 'Other';
      let order = 999;

      if (taskGroupBy === 'dueDate') {
        const dueDate = startOfDay(task.dueDate);
        if (dueDate < today) {
          groupTitle = 'Overdue';
          order = 0;
        } else if (dueDate.getTime() === today.getTime()) {
          groupTitle = 'Today';
          order = 1;
        } else if (dueDate.getTime() === tomorrow.getTime()) {
          groupTitle = 'Tomorrow';
          order = 2;
        } else if (dueDate <= nextWeek) {
          groupTitle = 'This Week';
          order = 3;
        } else {
          groupTitle = 'Later';
          order = 4;
        }
      }

      if (!groups.has(groupTitle)) {
        groups.set(groupTitle, []);
        groupOrder.set(groupTitle, order);
      }

      groups.get(groupTitle)?.push(task);
    });

    return [...groups.entries()]
      .sort((a, b) => {
        const orderA = groupOrder.get(a[0]) ?? 999;
        const orderB = groupOrder.get(b[0]) ?? 999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a[0].localeCompare(b[0]);
      })
      .map(([title, groupItems]) => ({
        title,
        tasks: [...groupItems].sort(
          (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
        ),
      }));
  }, [filteredTasks, taskGroupBy]);

  const filteredNotes = useMemo(() => {
    let filtered = [...notes];

    if (noteContextFilter === 'plants') {
      filtered = filtered.filter((note) => Boolean(note.plantId));
    }

    if (noteContextFilter === 'spaces') {
      filtered = filtered.filter((note) => Boolean(note.spaceId));
    }

    if (noteContextFilter === 'all' && noteScopeFilter === 'unlinked') {
      filtered = filtered.filter((note) => !note.plantId && !note.spaceId);
    }

    if (noteSearchQuery.trim()) {
      const query = noteSearchQuery.toLowerCase();
      filtered = filtered.filter((note) =>
        note.content.toLowerCase().includes(query)
      );
    }

    if (noteCategoryFilter !== 'all') {
      filtered = filtered.filter(
        (note) => note.category === noteCategoryFilter
      );
    }

    if (effectiveNoteSpaceFilter !== 'all') {
      if (effectiveNoteSpaceFilter === 'none') {
        filtered = filtered.filter((note) => !note.spaceId);
      } else {
        filtered = filtered.filter(
          (note) => note.spaceId === effectiveNoteSpaceFilter
        );
      }
    }

    if (effectiveNotePlantFilter !== 'all') {
      if (effectiveNotePlantFilter === 'none') {
        filtered = filtered.filter((note) => !note.plantId);
      } else {
        filtered = filtered.filter(
          (note) => note.plantId === effectiveNotePlantFilter
        );
      }
    }

    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return filtered;
  }, [
    notes,
    noteContextFilter,
    noteScopeFilter,
    noteSearchQuery,
    noteCategoryFilter,
    effectiveNoteSpaceFilter,
    effectiveNotePlantFilter,
  ]);
  const selectedTask = selectedTaskId
    ? (filteredTasks.find((task) => task.id === selectedTaskId) ?? null)
    : null;
  const selectedNote = selectedNoteId
    ? (filteredNotes.find((note) => note.id === selectedNoteId) ?? null)
    : null;

  const availableTaskPlantsForFilter = plants;

  const availableNotePlantsForFilter = plants;

  const noteContextCounts = useMemo(
    () => ({
      all: notes.length,
      plants: notes.filter((note) => Boolean(note.plantId)).length,
      spaces: notes.filter((note) => Boolean(note.spaceId)).length,
    }),
    [notes]
  );

  const noteEmptyStateTitle = useMemo(() => {
    if (notes.length === 0) {
      return 'No notes found';
    }

    if (noteContextFilter === 'plants') {
      return 'No plant notes';
    }

    if (noteContextFilter === 'spaces') {
      return 'No space notes';
    }

    if (noteScopeFilter === 'unlinked') {
      return 'No unlinked notes';
    }

    return 'No notes found';
  }, [notes.length, noteContextFilter, noteScopeFilter]);

  const noteEmptyStateDescription = useMemo(() => {
    if (notes.length === 0) {
      return 'Start documenting observations, issues, milestones, or photo progress here. Use tasks separately for work that needs scheduling.';
    }

    if (noteContextFilter === 'plants') {
      return "Try selecting a different plant or adjusting your search and category filters.";
    }

    if (noteContextFilter === 'spaces') {
      return "Try selecting a different space or adjusting your search and category filters.";
    }

    if (noteScopeFilter === 'unlinked') {
      return 'No unlinked notes match your current search or category filters.';
    }

    return "Try adjusting your search or filters to find what you're looking for.";
  }, [notes.length, noteContextFilter, noteScopeFilter]);

  useEffect(() => {
    if (
      !taskAutoSelectedRef.current &&
      filteredTasks.length > 0 &&
      !selectedTaskId
    ) {
      taskAutoSelectedRef.current = true;
      setSelectedTaskId(filteredTasks[0].id);
    }
  }, [filteredTasks, selectedTaskId]);

  useEffect(() => {
    if (
      selectedTaskId &&
      !filteredTasks.some((task) => task.id === selectedTaskId)
    ) {
      setSelectedTaskId(filteredTasks[0]?.id ?? null);
    }
  }, [filteredTasks, selectedTaskId]);

  useEffect(() => {
    if (
      !noteAutoSelectedRef.current &&
      filteredNotes.length > 0 &&
      !selectedNoteId
    ) {
      noteAutoSelectedRef.current = true;
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedNoteId]);

  useEffect(() => {
    if (
      selectedNoteId &&
      !filteredNotes.some((note) => note.id === selectedNoteId)
    ) {
      setSelectedNoteId(filteredNotes[0]?.id ?? null);
    }
  }, [filteredNotes, selectedNoteId]);

  useEffect(() => {
    setMobileDetailsOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'tasks' && !selectedTask) {
      setMobileDetailsOpen(false);
    }

    if (activeView === 'notes' && !selectedNote) {
      setMobileDetailsOpen(false);
    }
  }, [activeView, selectedTask, selectedNote]);

  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    if (isSmallViewport()) {
      setMobileDetailsOpen(true);
    }
  };

  const selectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    if (isSmallViewport()) {
      setMobileDetailsOpen(true);
    }
  };

  const openTaskCompletionFromList = (event: MouseEvent, task: Task) => {
    event.stopPropagation();
    setCompletingTask(task);
  };

  const openTaskCompletionFromDetails = (task: Task) => {
    setCompletingTask(task);
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
        const sourceTask = tasks.find((task) => task.id === taskId);
        await createNote(
          {
            content: noteData.content,
            category: noteData.category,
            plantId: sourceTask?.plantId,
            spaceId: sourceTask?.spaceId,
            timestamp: new Date(),
          },
          user.uid
        );
      }

      toast.success(
        noteData
          ? 'Task completed and note added successfully'
          : 'Task completed successfully'
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to complete task'
      );
      throw error;
    }
  };

  const handleCreateTaskClick = () => {
    setEditingTask(null);
    setCreateTaskOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setCreateTaskOpen(true);
  };

  const handleTaskFormSubmit = async (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setTaskFormLoading(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
        toast.success('Task updated successfully');
      } else {
        const createdTask = await createTask(taskData);
        setSelectedTaskId(createdTask.id);
        toast.success('Task created successfully');
      }

      setCreateTaskOpen(false);
      setEditingTask(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save task');
    } finally {
      setTaskFormLoading(false);
    }
  };

  const handleRequestDeleteTask = (task: Task) => {
    setPendingDeleteTask(task);
  };

  const handleDeleteTask = async () => {
    if (!pendingDeleteTask) return;

    try {
      await deleteTask(pendingDeleteTask.id);
      if (selectedTaskId === pendingDeleteTask.id) {
        const nextTask = filteredTasks.find(
          (task) => task.id !== pendingDeleteTask.id
        );
        setSelectedTaskId(nextTask?.id ?? null);
      }
      toast.success('Task deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete task');
    } finally {
      setPendingDeleteTask(null);
    }
  };

  const handleCreateNote = async (data: {
    content: string;
    category: NoteCategory;
    plantId?: string;
    spaceId?: string;
    timestamp?: Date;
    photos: File[];
  }) => {
    if (!user) return;

    setNoteFormLoading(true);
    try {
      await createNote(
        {
          content: data.content,
          category: data.category,
          plantId: data.plantId,
          spaceId: data.spaceId,
          timestamp: data.timestamp,
          photos: data.photos,
        },
        user.uid
      );
      setCreateNoteOpen(false);
      const newestNoteId = useNoteStore.getState().notes[0]?.id;
      if (newestNoteId) {
        setSelectedNoteId(newestNoteId);
      }
      toast.success('Note created successfully');
    } catch (error) {
      toast.error('Failed to create note');
    } finally {
      setNoteFormLoading(false);
    }
  };

  const handleUpdateNote = async (data: {
    content: string;
    category: NoteCategory;
    plantId?: string;
    spaceId?: string;
    timestamp?: Date;
    photos: File[];
  }) => {
    if (!editingNote) return;

    setNoteFormLoading(true);
    try {
      await updateNote(editingNote.id, {
        content: data.content,
        category: data.category,
        plantId: data.plantId ?? null,
        spaceId: data.spaceId ?? null,
        timestamp: data.timestamp,
      });
      setEditingNote(null);
      toast.success('Note updated successfully');
    } catch (error) {
      toast.error('Failed to update note');
    } finally {
      setNoteFormLoading(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!pendingDeleteNote) return;

    try {
      await deleteNote(pendingDeleteNote.id);
      if (selectedNoteId === pendingDeleteNote.id) {
        const nextNote = filteredNotes.find(
          (note) => note.id !== pendingDeleteNote.id
        );
        setSelectedNoteId(nextNote?.id ?? null);
      }
      toast.success('Note deleted successfully');
    } catch (error) {
      toast.error('Failed to delete note');
    } finally {
      setPendingDeleteNote(null);
    }
  };

  const renderTasksFilters = () => {
    const hasActiveTaskFilters =
      Boolean(taskSearchQuery.trim()) ||
      taskContextFilter !== 'all' ||
      taskScopeFilter !== 'all' ||
      taskStatusFilter !== 'all' ||
      taskPriorityFilter !== 'all' ||
      effectiveTaskSpaceFilter !== 'all' ||
      effectiveTaskPlantFilter !== 'all' ||
      taskGroupBy !== 'none';

    const taskStatusLabelMap: Record<Exclude<TaskStatusFilter, 'all'>, string> =
      {
        pending: 'Pending',
        completed: 'Completed',
        issues: 'Issues',
        dueSoon: 'Due Soon',
        overdue: 'Overdue',
      };

    const activeFilterChips: Array<{
      key: string;
      label: string;
      onRemove: () => void;
    }> = [];

    if (taskContextFilter === 'plants') {
      activeFilterChips.push({
        key: 'context-plants',
        label: 'Plants',
        onRemove: () => handleTaskContextChange('all'),
      });
    }

    if (taskContextFilter === 'spaces') {
      activeFilterChips.push({
        key: 'context-spaces',
        label: 'Spaces',
        onRemove: () => handleTaskContextChange('all'),
      });
    }

    if (taskScopeFilter === 'unlinked') {
      activeFilterChips.push({
        key: 'scope-unlinked',
        label: 'Unlinked',
        onRemove: () => handleTaskScopeChange('all'),
      });
    }

    if (taskStatusFilter !== 'all') {
      activeFilterChips.push({
        key: 'status',
        label: taskStatusLabelMap[taskStatusFilter],
        onRemove: () => updateSearchParams({ taskStatus: null }),
      });
    }

    if (taskPriorityFilter !== 'all') {
      activeFilterChips.push({
        key: 'priority',
        label: `${taskPriorityFilter.charAt(0).toUpperCase()}${taskPriorityFilter.slice(1)} Priority`,
        onRemove: () => updateSearchParams({ taskPriority: null }),
      });
    }

    if (taskContextFilter === 'plants' && effectiveTaskPlantFilter !== 'all') {
      const plantLabel =
        plants.find((plant) => plant.id === effectiveTaskPlantFilter)?.name ??
        'Plant';

      activeFilterChips.push({
        key: 'plant',
        label: plantLabel,
        onRemove: () => updateSearchParams({ taskPlantId: null }),
      });
    }

    if (taskContextFilter === 'spaces' && effectiveTaskSpaceFilter !== 'all') {
      const spaceLabel =
        spaces.find((space) => space.id === effectiveTaskSpaceFilter)?.name ??
        'Space';

      activeFilterChips.push({
        key: 'space',
        label: spaceLabel,
        onRemove: () => updateSearchParams({ taskSpaceId: null }),
      });
    }

    if (taskGroupBy !== 'none') {
      activeFilterChips.push({
        key: 'group-by',
        label: 'Group: Due Date',
        onRemove: () => updateSearchParams({ taskGroupBy: null }),
      });
    }

    return (
      <>
        <div className="mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <Tabs
            value={taskContextFilter}
            onValueChange={(value) =>
              handleTaskContextChange(value as TaskContextFilter)
            }
            className="min-w-max"
          >
            <TabsList className="min-w-max gap-1 bg-[#111d32] p-1">
              <TabsTrigger value="all">
                All
                {taskContextCounts.all > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 border-transparent bg-slate-700 px-1.5 text-[10px] text-slate-300"
                  >
                    {taskContextCounts.all}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="plants">
                Plants
                {taskContextCounts.plants > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 border-transparent bg-slate-700 px-1.5 text-[10px] text-slate-300"
                  >
                    {taskContextCounts.plants}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="spaces">
                Spaces
                {taskContextCounts.spaces > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 border-transparent bg-slate-700 px-1.5 text-[10px] text-slate-300"
                  >
                    {taskContextCounts.spaces}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mb-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex min-w-max items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={taskStatusFilter === 'all' ? 'secondary' : 'ghost'}
              className="h-9"
              aria-label="All statuses"
              onClick={() => updateSearchParams({ taskStatus: null })}
            >
              All
              {taskStatusCounts.all > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 border-transparent bg-slate-700 px-1.5 text-[10px] text-slate-300"
                >
                  {taskStatusCounts.all}
                </Badge>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={taskStatusFilter === 'pending' ? 'secondary' : 'ghost'}
              className="h-9"
              aria-label="Pending statuses"
              onClick={() => updateSearchParams({ taskStatus: 'pending' })}
            >
              Pending
              {taskStatusCounts.pending > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 border-transparent bg-slate-700 px-1.5 text-[10px] text-slate-300"
                >
                  {taskStatusCounts.pending}
                </Badge>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={taskStatusFilter === 'completed' ? 'secondary' : 'ghost'}
              className="h-9"
              aria-label="Completed statuses"
              onClick={() => updateSearchParams({ taskStatus: 'completed' })}
            >
              Completed
              {taskStatusCounts.completed > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 border-transparent bg-slate-700 px-1.5 text-[10px] text-slate-300"
                >
                  {taskStatusCounts.completed}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={taskSearchQuery}
              onChange={(event) => setTaskSearchQuery(event.target.value)}
              className="h-9 rounded-md border-transparent bg-[#1e293b] pl-9 text-slate-200 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-slate-700"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 space-y-4 border-slate-700 bg-[#111d32] text-slate-200"
            >
              {taskContextFilter === 'all' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Scope
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={taskScopeFilter === 'all' ? 'secondary' : 'ghost'}
                      className="justify-start"
                      onClick={() => handleTaskScopeChange('all')}
                    >
                      All tasks
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        taskScopeFilter === 'unlinked' ? 'secondary' : 'ghost'
                      }
                      className="justify-start"
                      onClick={() => handleTaskScopeChange('unlinked')}
                    >
                      Unlinked
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Smart status
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={taskStatusFilter === 'issues' ? 'secondary' : 'ghost'}
                    className="justify-center"
                    onClick={() => updateSearchParams({ taskStatus: 'issues' })}
                  >
                    Issues
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      taskStatusFilter === 'dueSoon' ? 'secondary' : 'ghost'
                    }
                    className="justify-center"
                    onClick={() => updateSearchParams({ taskStatus: 'dueSoon' })}
                  >
                    Due Soon
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={taskStatusFilter === 'overdue' ? 'secondary' : 'ghost'}
                    className="justify-center"
                    onClick={() => updateSearchParams({ taskStatus: 'overdue' })}
                  >
                    Overdue
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Priority
                </p>
                <Select
                  value={taskPriorityFilter}
                  onValueChange={(value: TaskPriority | 'all') =>
                    updateSearchParams({ taskPriority: value })
                  }
                >
                  <SelectTrigger className="h-9 border-slate-700 bg-[#0f172a] text-slate-200">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {taskContextFilter === 'plants' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Plant
                  </p>
                  <Select
                    value={effectiveTaskPlantFilter}
                    onValueChange={(value) => updateSearchParams({ taskPlantId: value })}
                  >
                    <SelectTrigger className="h-9 border-slate-700 bg-[#0f172a] text-slate-200">
                      <SelectValue placeholder="All plants" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plants</SelectItem>
                      {availableTaskPlantsForFilter.map((plant) => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {taskContextFilter === 'spaces' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Space
                  </p>
                  <Select
                    value={effectiveTaskSpaceFilter}
                    onValueChange={(value) => updateSearchParams({ taskSpaceId: value })}
                  >
                    <SelectTrigger className="h-9 border-slate-700 bg-[#0f172a] text-slate-200">
                      <SelectValue placeholder="All spaces" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Spaces</SelectItem>
                      {spaces.map((space) => (
                        <SelectItem key={space.id} value={space.id}>
                          {space.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Group by
                </p>
                <Select
                  value={taskGroupBy}
                  onValueChange={(value: TaskGroupBy) =>
                    updateSearchParams({ taskGroupBy: value })
                  }
                >
                  <SelectTrigger className="h-9 border-slate-700 bg-[#0f172a] text-slate-200">
                    <SelectValue placeholder="No grouping" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grouping</SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>

          {hasActiveTaskFilters && (
            <Button
              variant="ghost"
              className="h-9 text-slate-400 hover:bg-slate-800 hover:text-white"
              onClick={() => {
                setTaskSearchQuery('');
                updateSearchParams({
                  taskContext: null,
                  taskScope: null,
                  taskStatus: null,
                  taskPriority: null,
                  taskSpaceId: null,
                  taskPlantId: null,
                  taskGroupBy: null,
                  tab: null,
                  taskTab: null,
                  priority: null,
                  groupBy: null,
                });
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {activeFilterChips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
              >
                <span>{chip.label}</span>
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderNotesFilters = () => {
    const hasActiveNoteFilters =
      Boolean(noteSearchQuery.trim()) ||
      noteCategoryFilter !== 'all' ||
      noteContextFilter !== 'all' ||
      noteScopeFilter !== 'all' ||
      effectiveNoteSpaceFilter !== 'all' ||
      effectiveNotePlantFilter !== 'all';

    const activeFilterChips: Array<{
      key: string;
      label: string;
      onRemove: () => void;
    }> = [];

    if (noteScopeFilter === 'unlinked') {
      activeFilterChips.push({
        key: 'scope-unlinked',
        label: 'Unlinked',
        onRemove: () => handleNoteScopeChange('all'),
      });
    }

    if (noteCategoryFilter !== 'all') {
      activeFilterChips.push({
        key: 'category',
        label: getNoteCategoryLabel(noteCategoryFilter),
        onRemove: () => updateSearchParams({ category: null }),
      });
    }

    if (noteContextFilter === 'plants' && effectiveNotePlantFilter !== 'all') {
      const plantLabel =
        plants.find((plant) => plant.id === effectiveNotePlantFilter)?.name ??
        'Plant';

      activeFilterChips.push({
        key: 'plant',
        label: plantLabel,
        onRemove: () => updateSearchParams({ plantId: null }),
      });
    }

    if (noteContextFilter === 'spaces' && effectiveNoteSpaceFilter !== 'all') {
      const spaceLabel =
        spaces.find((space) => space.id === effectiveNoteSpaceFilter)?.name ??
        'Space';

      activeFilterChips.push({
        key: 'space',
        label: spaceLabel,
        onRemove: () => updateSearchParams({ spaceId: null }),
      });
    }

    return (
      <>
        <div className="mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <Tabs
            value={noteContextFilter}
            onValueChange={(value) =>
              handleNoteContextChange(value as NoteContextFilter)
            }
            className="min-w-max"
          >
            <TabsList className="min-w-max gap-1 bg-[#111d32] p-1">
              <TabsTrigger value="all">
                All
                {noteContextCounts.all > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 border-transparent bg-slate-700 px-1.5 text-[10px] text-slate-300"
                  >
                    {noteContextCounts.all}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="plants">
                Plants
                {noteContextCounts.plants > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 border-transparent bg-slate-700 px-1.5 text-[10px] text-slate-300"
                  >
                    {noteContextCounts.plants}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="spaces">
                Spaces
                {noteContextCounts.spaces > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 border-transparent bg-slate-700 px-1.5 text-[10px] text-slate-300"
                  >
                    {noteContextCounts.spaces}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search notes..."
              value={noteSearchQuery}
              onChange={(event) => setNoteSearchQuery(event.target.value)}
              className="h-9 rounded-md border-transparent bg-[#1e293b] pl-9 text-slate-200 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-slate-700"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 space-y-4 border-slate-700 bg-[#111d32] text-slate-200"
            >
              {noteContextFilter === 'all' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Scope
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={noteScopeFilter === 'all' ? 'secondary' : 'ghost'}
                      className="justify-start"
                      onClick={() => handleNoteScopeChange('all')}
                    >
                      All notes
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={noteScopeFilter === 'unlinked' ? 'secondary' : 'ghost'}
                      className="justify-start"
                      onClick={() => handleNoteScopeChange('unlinked')}
                    >
                      Unlinked
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Category
                </p>
                <Select
                  value={noteCategoryFilter}
                  onValueChange={(value) => updateSearchParams({ category: value })}
                >
                  <SelectTrigger className="h-9 border-slate-700 bg-[#0f172a] text-slate-200">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {NOTE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {noteContextFilter === 'plants' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Plant
                  </p>
                  <Select
                    value={effectiveNotePlantFilter}
                    onValueChange={(value) => updateSearchParams({ plantId: value })}
                  >
                    <SelectTrigger className="h-9 border-slate-700 bg-[#0f172a] text-slate-200">
                      <SelectValue placeholder="All plants" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plants</SelectItem>
                      {availableNotePlantsForFilter.map((plant) => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {noteContextFilter === 'spaces' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Space
                  </p>
                  <Select
                    value={effectiveNoteSpaceFilter}
                    onValueChange={(value) => updateSearchParams({ spaceId: value })}
                  >
                    <SelectTrigger className="h-9 border-slate-700 bg-[#0f172a] text-slate-200">
                      <SelectValue placeholder="All spaces" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Spaces</SelectItem>
                      {spaces.map((space) => (
                        <SelectItem key={space.id} value={space.id}>
                          {space.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {hasActiveNoteFilters && (
            <Button
              variant="ghost"
              className="h-9 text-slate-400 hover:bg-slate-800 hover:text-white"
              onClick={() => {
                setNoteSearchQuery('');
                updateSearchParams({
                  noteContext: null,
                  category: null,
                  spaceId: null,
                  plantId: null,
                });
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {activeFilterChips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
              >
                <span>{chip.label}</span>
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </>
    );
  };
  return (
    <DashboardLayout title="">
      <div className="-m-4 flex h-[calc(100vh-theme(spacing.16))] overflow-hidden bg-[#0B1120] font-sans text-slate-200 md:-m-8">
        <div className="flex w-full flex-col border-r border-[#1e293b] bg-[#0f172a] transition-all duration-300 lg:w-1/2">
          <div className="p-6 pb-2">
            <div className="mb-6 flex items-center gap-3 text-sm font-medium text-slate-400">
              <span className={activeView === 'notes' ? 'text-white' : ''}>
                Notes
              </span>
              <button
                onClick={() =>
                  handleViewChange(activeView === 'tasks' ? 'notes' : 'tasks')
                }
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-700 transition-colors focus:outline-none"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeView === 'tasks' ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
              <span className={activeView === 'tasks' ? 'text-white' : ''}>
                Tasks
              </span>
            </div>

            {activeView === 'tasks' ? (
              <>
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white">Tasks</h1>
                    <Badge
                      variant="secondary"
                      className="border-transparent bg-slate-800 px-3 text-slate-300"
                    >
                      {filteredTasks.length}
                    </Badge>
                  </div>
                  <Button
                    onClick={handleCreateTaskClick}
                    className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                </div>

                <p className="mb-4 max-w-3xl text-sm text-slate-400">
                  {tasksHelperCopy}
                </p>

                {renderTasksFilters()}
              </>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white">Notes</h1>
                    <Badge
                      variant="secondary"
                      className="border-transparent bg-slate-800 px-3 text-slate-300"
                    >
                      {filteredNotes.length}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => setCreateNoteOpen(true)}
                    className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Note
                  </Button>
                </div>

                <p className="mb-4 max-w-3xl text-sm text-slate-400">
                  {notesHelperCopy}
                </p>

                {renderNotesFilters()}
              </>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-6 pb-6">
            {activeView === 'tasks' ? (
              taskError ? (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                  {taskError}
                </div>
              ) : tasksLoading && filteredTasks.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  Loading tasks...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  No tasks match your filters.
                </div>
              ) : (
                groupedTasks.map((group) => (
                  <div key={group.title} className="space-y-3">
                    {taskGroupBy !== 'none' && (
                      <div className="flex items-center justify-between px-1 pt-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                          {group.title}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="border-transparent bg-slate-800 px-2 text-xs text-slate-300"
                        >
                          {group.tasks.length}
                        </Badge>
                      </div>
                    )}
                    {group.tasks.map((task) => {
                      const isSelected = selectedTask?.id === task.id;
                      const overdue = isTaskOverdue(task);

                      return (
                        <div
                          key={task.id}
                          onClick={() => selectTask(task.id)}
                          className={`group cursor-pointer rounded-xl border p-4 transition-all ${
                            isSelected
                              ? 'border-slate-700 bg-[#1e293b]'
                              : 'border-slate-800/60 bg-transparent hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="mt-1">
                                {task.status === 'completed' ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(event) =>
                                      openTaskCompletionFromList(event, task)
                                    }
                                    className="rounded-full p-0.5 text-slate-600 transition-colors hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
                                    aria-label={`Mark ${task.title} complete`}
                                    title="Mark complete"
                                  >
                                    <Circle
                                      className={`h-5 w-5 ${overdue ? 'text-amber-500' : ''}`}
                                    />
                                  </button>
                                )}
                              </div>
                              <div className="space-y-1">
                                <h3
                                  className={`font-medium ${task.status === 'completed' ? 'text-slate-300' : 'text-slate-200'}`}
                                >
                                  {task.title}
                                </h3>
                                <p
                                  className={`text-sm ${overdue ? 'text-amber-500/80' : 'text-slate-500'}`}
                                >
                                  Due {formatDate(task.dueDate)}
                                </p>
                                {task.recurrence && (
                                  <p className="text-xs text-slate-500">
                                    {formatRecurrence(task)}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Badge
                                variant="secondary"
                                className={`border-transparent px-3 font-medium capitalize ${getTaskPriorityClassName(task.priority)}`}
                              >
                                {task.priority}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(event) => event.stopPropagation()}
                                    className="h-8 w-8 text-slate-500 hover:bg-slate-700/60 hover:text-slate-200"
                                    aria-label={`Task actions for ${task.title}`}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <DropdownMenuItem
                                    onClick={() => handleEditTask(task)}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit task
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleRequestDeleteTask(task)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete task
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )
            ) : noteError ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                {noteError}
              </div>
            ) : notesLoading && filteredNotes.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                Loading notes...
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-[#0B1120]/70 p-8 text-center">
                <StickyNote className="mx-auto mb-4 h-10 w-10 text-slate-500" />
                <h3 className="mb-2 text-lg font-medium text-slate-200">
                  {noteEmptyStateTitle}
                </h3>
                <p className="mb-5 text-sm text-slate-500">
                  {noteEmptyStateDescription}
                </p>
                {notes.length === 0 && (
                  <Button
                    onClick={() => setCreateNoteOpen(true)}
                    className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Note
                  </Button>
                )}
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = selectedNote?.id === note.id;
                const plant = note.plantId
                  ? plants.find((item) => item.id === note.plantId)
                  : undefined;
                const space = note.spaceId
                  ? spaces.find((item) => item.id === note.spaceId)
                  : undefined;

                return (
                  <div
                    key={note.id}
                    onClick={() => selectNote(note.id)}
                    className={`group cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-slate-700 bg-[#1e293b]'
                        : 'border-slate-800/60 bg-transparent hover:border-slate-700'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <Badge
                        variant="secondary"
                        className={`border-transparent px-3 py-1 font-medium ${getNoteCategoryClassName(note.category)}`}
                      >
                        {getNoteCategoryLabel(note.category)}
                      </Badge>
                      {note.photos.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span>{note.photos.length}</span>
                        </div>
                      )}
                    </div>

                    <p className="mb-3 line-clamp-2 text-base font-medium text-slate-200">
                      {note.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{formatDateTime(note.timestamp)}</span>
                      <span className="text-slate-700" aria-hidden="true">
                        &bull;
                      </span>
                      <span>
                        {formatDistanceToNow(note.timestamp, {
                          addSuffix: true,
                        })}
                      </span>
                      {space && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {space.name}
                        </span>
                      )}
                      {plant && (
                        <span className="inline-flex items-center gap-1">
                          <Leaf className="h-3.5 w-3.5" />
                          {plant.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="relative hidden w-1/2 flex-col lg:flex">
          <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-emerald-900/10 blur-[100px]" />

          <div className="z-10 flex-1 overflow-y-auto p-8">
            {activeView === 'tasks' ? (
              <TaskDetailsContent
                task={selectedTask}
                spaces={spaces}
                plants={plants}
                onMarkComplete={openTaskCompletionFromDetails}
                onEdit={handleEditTask}
                onDelete={handleRequestDeleteTask}
                onClose={() => setSelectedTaskId(null)}
              />
            ) : (
              <NoteDetailsContent
                note={selectedNote}
                spaces={spaces}
                plants={plants}
                onEdit={(note) => setEditingNote(note)}
                onDelete={(note) => setPendingDeleteNote(note)}
                onOpenPhoto={(photoUrl) => setSelectedPhotoUrl(photoUrl)}
                onClose={() => setSelectedNoteId(null)}
              />
            )}
          </div>
        </div>
      </div>

      <Sheet open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <SheetContent
          side="bottom"
          className="h-[88vh] border-[#1e293b] bg-[#0B1120] p-0 text-slate-200 sm:max-w-none"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>
              {activeView === 'tasks' ? 'Task details' : 'Note details'}
            </SheetTitle>
            <SheetDescription>
              {activeView === 'tasks'
                ? 'View all fields for the selected task.'
                : 'View all fields and photos for the selected note.'}
            </SheetDescription>
          </SheetHeader>
          <div className="h-full overflow-y-auto p-6">
            {activeView === 'tasks' ? (
              <TaskDetailsContent
                task={selectedTask}
                spaces={spaces}
                plants={plants}
                onMarkComplete={openTaskCompletionFromDetails}
                onEdit={(task) => {
                  setMobileDetailsOpen(false);
                  handleEditTask(task);
                }}
                onDelete={(task) => {
                  setMobileDetailsOpen(false);
                  handleRequestDeleteTask(task);
                }}
              />
            ) : (
              <NoteDetailsContent
                note={selectedNote}
                spaces={spaces}
                plants={plants}
                onEdit={(note) => {
                  setMobileDetailsOpen(false);
                  setEditingNote(note);
                }}
                onDelete={(note) => {
                  setMobileDetailsOpen(false);
                  setPendingDeleteNote(note);
                }}
                onOpenPhoto={(photoUrl) => setSelectedPhotoUrl(photoUrl)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <TaskCompletionDialog
        task={completingTask}
        spaces={spaces}
        plants={plants}
        open={!!completingTask}
        onOpenChange={(open) => !open && setCompletingTask(null)}
        onComplete={handleTaskCompletion}
      />

      <Dialog
        open={createTaskOpen}
        onOpenChange={(open) => {
          setCreateTaskOpen(open);
          if (!open) {
            setEditingTask(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription>
              Plan scheduled care actions with due dates, priority, and optional
              repeat cadence.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            task={editingTask ?? undefined}
            spaces={spaces}
            plants={plants}
            onSubmit={handleTaskFormSubmit}
            onCancel={() => {
              setCreateTaskOpen(false);
              setEditingTask(null);
            }}
            isLoading={taskFormLoading}
            initialSpaceId={
              taskSpaceFilter !== 'all' && taskSpaceFilter !== 'none'
                ? taskSpaceFilter
                : undefined
            }
            initialPlantId={
              taskPlantFilter !== 'all' && taskPlantFilter !== 'none'
                ? taskPlantFilter
                : undefined
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog open={createNoteOpen} onOpenChange={setCreateNoteOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
            <DialogDescription>
              Record an observation, issue, milestone, or photo update. If it
              needs a due date or repeat schedule, use a task instead.
            </DialogDescription>
          </DialogHeader>
          <NoteForm
            onSubmit={handleCreateNote}
            onCancel={() => setCreateNoteOpen(false)}
            initialSpaceId={
              noteSpaceFilter !== 'all' ? noteSpaceFilter : undefined
            }
            initialPlantId={
              notePlantFilter !== 'all' ? notePlantFilter : undefined
            }
            loading={noteFormLoading}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingNote}
        onOpenChange={(open) => !open && setEditingNote(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update the note details, category, or date so your history stays
              accurate and easy to search.
            </DialogDescription>
          </DialogHeader>
          {editingNote && (
            <NoteForm
              onSubmit={handleUpdateNote}
              onCancel={() => setEditingNote(null)}
              initialPlantId={editingNote.plantId}
              initialSpaceId={editingNote.spaceId}
              initialContent={editingNote.content}
              initialCategory={editingNote.category}
              initialTimestamp={editingNote.timestamp}
              showPhotoUpload={false}
              submitLabel="Update Note"
              loading={noteFormLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedPhotoUrl}
        onOpenChange={(open) => !open && setSelectedPhotoUrl(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Photo</DialogTitle>
          </DialogHeader>
          {selectedPhotoUrl && (
            <div className="flex justify-center">
              <img
                src={selectedPhotoUrl}
                alt="Note attachment"
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDeleteTask}
        onOpenChange={(open) => !open && setPendingDeleteTask(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be
              undone.
              {pendingDeleteTask?.status === 'completed' && (
                <span className="mt-2 block font-medium">
                  This task is already completed and will be removed from your
                  history.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingDeleteNote}
        onOpenChange={(open) => !open && setPendingDeleteNote(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
              {pendingDeleteNote && pendingDeleteNote.photos.length > 0 && (
                <span className="mt-2 block font-medium">
                  This will also delete {pendingDeleteNote.photos.length}{' '}
                  associated photo(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

export default function EventsPage() {
  return (
    <ProtectedRoute>
      <EventsContent />
    </ProtectedRoute>
  );
}
