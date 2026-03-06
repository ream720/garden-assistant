import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  Share,
  Sidebar,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { NoteForm } from '../components/notes/NoteForm';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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

const parseEventsView = (value: string | null): EventsView =>
  value === 'notes' ? 'notes' : 'tasks';
const isSmallViewport = () =>
  typeof window !== 'undefined' && window.innerWidth < 1024;

const formatDate = (date: Date) => format(date, 'MMM d, yyyy');
const formatDateTime = (date?: Date) =>
  date ? format(date, 'MMM d, yyyy h:mm a') : 'Not available';

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
  onClose,
}: {
  task: Task | null;
  spaces: GrowSpace[];
  plants: Plant[];
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
        <Button
          variant="outline"
          size="icon"
          className="rounded-lg border-transparent bg-[#1e293b] text-slate-400 hover:bg-[#243247] hover:text-white"
        >
          <Share className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-lg border-transparent bg-[#1e293b] text-slate-400 hover:bg-[#243247] hover:text-white"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
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

      <div className="mt-12 rounded-xl border border-slate-800 bg-[#0f172a]/50 p-4">
        <Input
          type="text"
          placeholder="Add a comment..."
          className="mb-6 h-10 rounded-lg border-transparent bg-[#1e293b] text-slate-200 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-slate-700"
        />

        <div className="relative space-y-6 pl-4 before:absolute before:inset-0 before:ml-8 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
          <div className="relative flex items-start gap-4">
            <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-[#0B1120] bg-[#1e293b] text-xs font-medium text-slate-400">
              T
            </div>
            <div>
              <p className="text-sm text-slate-300">
                <span className="font-medium text-slate-200">Added task</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Created{' '}
                {formatDistanceToNow(task.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>
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
          className="rounded-lg border-transparent bg-[#1e293b] text-slate-400 hover:bg-[#243247] hover:text-white"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onDelete(note)}
          className="rounded-lg border-transparent bg-[#1e293b] text-slate-400 hover:bg-[#243247] hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
          <span className="text-sm text-slate-600">�</span>
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
  const noteCategoryFilter = searchParams.get('category') || 'all';
  const noteSpaceFilter = searchParams.get('spaceId') || 'all';
  const notePlantFilter = searchParams.get('plantId') || 'all';

  const { user } = useAuthStore();
  const {
    tasks,
    loadTasks,
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
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>(
    'all'
  );
  const [filterSpace, setFilterSpace] = useState<string>('all');
  const [filterPlant, setFilterPlant] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<string>('none');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
      category:
        noteCategoryFilter !== 'all'
          ? (noteCategoryFilter as NoteCategory)
          : undefined,
      spaceId: noteSpaceFilter !== 'all' ? noteSpaceFilter : undefined,
      plantId: notePlantFilter !== 'all' ? notePlantFilter : undefined,
    });
  }, [user, loadNotes, noteCategoryFilter, notePlantFilter, noteSpaceFilter]);

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

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    if (taskSearchQuery.trim()) {
      const query = taskSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    if (filterSpace !== 'all') {
      if (filterSpace === 'none') {
        filtered = filtered.filter((task) => !task.spaceId);
      } else {
        filtered = filtered.filter((task) => task.spaceId === filterSpace);
      }
    }

    if (filterPlant !== 'all') {
      if (filterPlant === 'none') {
        filtered = filtered.filter((task) => !task.plantId);
      } else {
        filtered = filtered.filter((task) => task.plantId === filterPlant);
      }
    }

    filtered.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return filtered;
  }, [tasks, taskSearchQuery, filterPriority, filterSpace, filterPlant]);

  const filteredNotes = useMemo(() => {
    let filtered = [...notes];

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

    if (noteSpaceFilter !== 'all') {
      filtered = filtered.filter((note) => note.spaceId === noteSpaceFilter);
    }

    if (notePlantFilter !== 'all') {
      filtered = filtered.filter((note) => note.plantId === notePlantFilter);
    }

    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return filtered;
  }, [
    notes,
    noteSearchQuery,
    noteCategoryFilter,
    noteSpaceFilter,
    notePlantFilter,
  ]);
  const selectedTask = selectedTaskId
    ? (filteredTasks.find((task) => task.id === selectedTaskId) ?? null)
    : null;
  const selectedNote = selectedNoteId
    ? (filteredNotes.find((note) => note.id === selectedNoteId) ?? null)
    : null;

  const availableNotePlantsForFilter =
    noteSpaceFilter !== 'all'
      ? plants.filter((plant) => plant.spaceId === noteSpaceFilter)
      : plants;

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

  const renderNotesFilters = () => (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <Select
        value={noteCategoryFilter}
        onValueChange={(value) => updateSearchParams({ category: value })}
      >
        <SelectTrigger className="h-9 w-auto gap-2 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {NOTE_CATEGORIES.map((category) => (
            <SelectItem key={category.value} value={category.value}>
              {category.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={noteSpaceFilter}
        onValueChange={(value) =>
          updateSearchParams({ spaceId: value, plantId: null })
        }
      >
        <SelectTrigger className="h-9 w-auto gap-2 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
          <SelectValue placeholder="All Spaces" />
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

      <Select
        value={notePlantFilter}
        onValueChange={(value) => updateSearchParams({ plantId: value })}
      >
        <SelectTrigger className="h-9 w-auto gap-2 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
          <SelectValue placeholder="All Plants" />
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

      <div className="relative ml-auto hidden max-w-[220px] flex-1 sm:block">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
        <Input
          type="text"
          placeholder="Search notes..."
          value={noteSearchQuery}
          onChange={(event) => setNoteSearchQuery(event.target.value)}
          className="h-9 rounded-md border-transparent bg-[#1e293b] pl-9 text-slate-200 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-slate-700"
        />
      </div>

      {(noteSearchQuery ||
        noteCategoryFilter !== 'all' ||
        noteSpaceFilter !== 'all' ||
        notePlantFilter !== 'all') && (
        <Button
          variant="ghost"
          className="text-slate-400 hover:bg-slate-800 hover:text-white"
          onClick={() => {
            setNoteSearchQuery('');
            updateSearchParams({
              category: null,
              spaceId: null,
              plantId: null,
            });
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
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
                <div className="mb-6 flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-white">Tasks</h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-white"
                  >
                    <Sidebar className="h-5 w-5" />
                  </Button>
                </div>

                <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <Select
                    value={filterPriority}
                    onValueChange={(value: TaskPriority | 'all') =>
                      setFilterPriority(value)
                    }
                  >
                    <SelectTrigger className="h-9 w-auto gap-2 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterSpace} onValueChange={setFilterSpace}>
                    <SelectTrigger className="h-9 w-auto gap-2 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
                      <SelectValue placeholder="Space" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Spaces</SelectItem>
                      <SelectItem value="none">No Space</SelectItem>
                      {spaces.map((space) => (
                        <SelectItem key={space.id} value={space.id}>
                          {space.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterPlant} onValueChange={setFilterPlant}>
                    <SelectTrigger className="h-9 w-auto gap-2 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
                      <SelectValue placeholder="Plant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plants</SelectItem>
                      <SelectItem value="none">No Plant</SelectItem>
                      {plants.map((plant) => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="h-9 w-auto gap-2 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
                      <SelectValue placeholder="Group By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Grouping</SelectItem>
                      <SelectItem value="space">Space</SelectItem>
                      <SelectItem value="plant">Plant</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative ml-auto hidden max-w-[200px] flex-1 sm:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Search tasks..."
                      value={taskSearchQuery}
                      onChange={(e) => setTaskSearchQuery(e.target.value)}
                      className="h-9 rounded-md border-transparent bg-[#1e293b] pl-9 text-slate-200 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-slate-700"
                    />
                  </div>
                </div>
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
                filteredTasks.map((task) => {
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
                            ) : overdue ? (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-slate-600" />
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

                        <Badge
                          variant="secondary"
                          className={`border-transparent px-3 font-medium capitalize ${getTaskPriorityClassName(task.priority)}`}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  );
                })
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
                  No notes found
                </h3>
                <p className="mb-5 text-sm text-slate-500">
                  Try a different filter, or add a new note for observations,
                  issues, milestones, or photo updates.
                </p>
                <Button
                  onClick={() => setCreateNoteOpen(true)}
                  className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
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
