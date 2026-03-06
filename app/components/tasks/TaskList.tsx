import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, Search, Calendar, AlertTriangle } from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Separator } from '../ui/separator';

import { TaskCard } from './TaskCard';
import { FeatureHelpPopover } from '../shared/FeatureHelpPopover';
import type { Task, GrowSpace, Plant, TaskPriority } from '../../lib/types';
import { cn } from '../../lib/utils';

interface TaskListProps {
  tasks: Task[];
  spaces: GrowSpace[];
  plants: Plant[];
  loading?: boolean;
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateNote?: (task: Task) => void;
  className?: string;
}

type FilterTab = 'all' | 'pending' | 'issues' | 'dueSoon' | 'overdue' | 'completed';
type GroupBy = 'none' | 'space' | 'plant' | 'priority' | 'dueDate';

const parseFilterTab = (value: string | null): FilterTab => {
  if (
    value === 'all' ||
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

const parsePriorityFilter = (value: string | null): TaskPriority | 'all' => {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }

  return 'all';
};

const tabLabelByValue: Record<FilterTab, string> = {
  all: 'all',
  pending: 'pending',
  issues: 'issues',
  dueSoon: 'due soon',
  overdue: 'overdue',
  completed: 'completed',
};

export function TaskList({
  tasks,
  spaces,
  plants,
  loading = false,
  onCreateTask,
  onEditTask,
  onCompleteTask,
  onDeleteTask,
  onCreateNote,
  className,
}: TaskListProps) {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>(() =>
    parseFilterTab(searchParams.get('tab'))
  );
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>(() =>
    parsePriorityFilter(searchParams.get('priority'))
  );
  const [filterSpace, setFilterSpace] = useState<string>('all');
  const [filterPlant, setFilterPlant] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }

    // Time windows used by tab filters
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dueSoonWindowEnd = new Date(startOfToday);
    dueSoonWindowEnd.setDate(dueSoonWindowEnd.getDate() + 1);

    // Tab filter
    switch (filterTab) {
      case 'pending':
        filtered = filtered.filter((task) => task.status === 'pending');
        break;
      case 'issues':
        filtered = filtered.filter(
          (task) =>
            task.status === 'pending' &&
            (task.priority === 'high' || task.dueDate < startOfToday)
        );
        break;
      case 'dueSoon':
        filtered = filtered.filter(
          (task) =>
            task.status === 'pending' &&
            task.dueDate >= startOfToday &&
            task.dueDate <= dueSoonWindowEnd
        );
        break;
      case 'overdue':
        filtered = filtered.filter(
          (task) => task.status === 'pending' && task.dueDate < startOfToday
        );
        break;
      case 'completed':
        filtered = filtered.filter((task) => task.status === 'completed');
        break;
      // 'all' shows everything
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    // Space filter
    if (filterSpace !== 'all') {
      if (filterSpace === 'none') {
        filtered = filtered.filter((task) => !task.spaceId);
      } else {
        filtered = filtered.filter((task) => task.spaceId === filterSpace);
      }
    }

    // Plant filter
    if (filterPlant !== 'all') {
      if (filterPlant === 'none') {
        filtered = filtered.filter((task) => !task.plantId);
      } else {
        filtered = filtered.filter((task) => task.plantId === filterPlant);
      }
    }

    return filtered;
  }, [tasks, searchQuery, filterTab, filterPriority, filterSpace, filterPlant]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Tasks': filteredTasks };
    }

    const groups: Record<string, Task[]> = {};

    filteredTasks.forEach((task) => {
      let groupKey = 'Other';

      switch (groupBy) {
        case 'space':
          if (task.spaceId) {
            const space = spaces.find((s) => s.id === task.spaceId);
            groupKey = space ? space.name : 'Unknown Space';
          } else {
            groupKey = 'No Space';
          }
          break;
        case 'plant':
          if (task.plantId) {
            const plant = plants.find((p) => p.id === task.plantId);
            groupKey = plant ? `${plant.name} (${plant.variety})` : 'Unknown Plant';
          } else {
            groupKey = 'No Plant';
          }
          break;
        case 'priority':
          groupKey = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
          break;
        case 'dueDate': {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);

          if (task.dueDate < today) {
            groupKey = 'Overdue';
          } else if (task.dueDate.toDateString() === today.toDateString()) {
            groupKey = 'Today';
          } else if (task.dueDate.toDateString() === tomorrow.toDateString()) {
            groupKey = 'Tomorrow';
          } else if (task.dueDate <= nextWeek) {
            groupKey = 'This Week';
          } else {
            groupKey = 'Later';
          }
          break;
        }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });

    // Sort groups
    const sortedGroups: Record<string, Task[]> = {};
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (groupBy === 'priority') {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return (
          (priorityOrder[a as keyof typeof priorityOrder] || 3) -
          (priorityOrder[b as keyof typeof priorityOrder] || 3)
        );
      }

      if (groupBy === 'dueDate') {
        const dateOrder = {
          Overdue: 0,
          Today: 1,
          Tomorrow: 2,
          'This Week': 3,
          Later: 4,
        };
        return (
          (dateOrder[a as keyof typeof dateOrder] || 5) -
          (dateOrder[b as keyof typeof dateOrder] || 5)
        );
      }

      return a.localeCompare(b);
    });

    sortedKeys.forEach((key) => {
      sortedGroups[key] = groups[key].sort(
        (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
      );
    });

    return sortedGroups;
  }, [filteredTasks, groupBy, spaces, plants]);

  // Calculate counts for tabs
  const taskCounts = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dueSoonWindowEnd = new Date(startOfToday);
    dueSoonWindowEnd.setDate(dueSoonWindowEnd.getDate() + 1);

    return {
      all: tasks.length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      issues: tasks.filter(
        (task) =>
          task.status === 'pending' &&
          (task.priority === 'high' || task.dueDate < startOfToday)
      ).length,
      dueSoon: tasks.filter(
        (task) =>
          task.status === 'pending' &&
          task.dueDate >= startOfToday &&
          task.dueDate <= dueSoonWindowEnd
      ).length,
      overdue: tasks.filter(
        (task) => task.status === 'pending' && task.dueDate < startOfToday
      ).length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    };
  }, [tasks]);

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Tasks</h2>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Tasks</h2>
            <FeatureHelpPopover
              label="Tasks help"
              title="Use tasks for scheduled actions"
              description="Tasks are best for care work that must happen by a date or on a repeating cadence."
              items={[
                'Set due dates so important work does not get missed.',
                'Use priority to surface urgent work first.',
                'Use notes for observations, photos, and long-term context.',
              ]}
            />
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Tasks are for scheduled care and required actions. Use notes for open-ended observations, photo logs, and long-term context.
          </p>
        </div>
        <Button onClick={onCreateTask}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={filterPriority}
                  onValueChange={(value: TaskPriority | 'all') => setFilterPriority(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Space</label>
                <Select value={filterSpace} onValueChange={setFilterSpace}>
                  <SelectTrigger>
                    <SelectValue />
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
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Plant</label>
                <Select value={filterPlant} onValueChange={setFilterPlant}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plants</SelectItem>
                    <SelectItem value="none">No Plant</SelectItem>
                    {plants.map((plant) => (
                      <SelectItem key={plant.id} value={plant.id}>
                        {plant.name} ({plant.variety})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Group By</label>
                <Select value={groupBy} onValueChange={(value: GroupBy) => setGroupBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grouping</SelectItem>
                    <SelectItem value="space">Space</SelectItem>
                    <SelectItem value="plant">Plant</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Tabs */}
      <Tabs value={filterTab} onValueChange={(value: string) => setFilterTab(value as FilterTab)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all" className="relative">
            All
            {taskCounts.all > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {taskCounts.all}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending
            {taskCounts.pending > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {taskCounts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="issues" className="relative">
            <AlertTriangle className="mr-1 h-4 w-4" />
            Issues
            {taskCounts.issues > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {taskCounts.issues}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dueSoon" className="relative">
            Due Soon
            {taskCounts.dueSoon > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {taskCounts.dueSoon}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="relative">
            <AlertTriangle className="mr-1 h-4 w-4" />
            Overdue
            {taskCounts.overdue > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {taskCounts.overdue}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {taskCounts.completed > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {taskCounts.completed}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterTab} className="mt-6">
          {/* Task Groups */}
          <div className="space-y-6">
            {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
              <div key={groupName}>
                {groupBy !== 'none' && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{groupName}</h3>
                      <Badge variant="outline">{groupTasks.length}</Badge>
                    </div>
                    <Separator className="mb-4" />
                  </>
                )}

                {groupTasks.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                      <p className="text-muted-foreground mb-4">
                        {filterTab === 'all'
                          ? "You don't have any tasks yet."
                          : `No ${tabLabelByValue[filterTab]} tasks match your current filters.`}
                      </p>
                      <Button onClick={onCreateTask}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Task
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {groupTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        spaces={spaces}
                        plants={plants}
                        onComplete={onCompleteTask}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                        onCreateNote={onCreateNote}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}



