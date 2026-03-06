import { CalendarDays, CheckSquare, StickyNote } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import { FeatureHelpPopover } from './FeatureHelpPopover';

interface EventsGuideProps {
  activeFeature: 'notes' | 'tasks';
  className?: string;
}

const noteDetails = [
  'Capture observations, issues, milestones, and context you want to find later.',
  'Add photos and backdate entries when logging after the fact.',
  'Attach entries to a plant or space for easier filtering and search.',
];

const taskDetails = [
  'Plan work that must happen on a date, like transplanting or feeding.',
  'Set priority and optionally repeat tasks for routine maintenance.',
  'Use completion notes to capture outcomes once the task is done.',
];

export function EventsGuide({ activeFeature, className }: EventsGuideProps) {
  const isNotesActive = activeFeature === 'notes';
  const isTasksActive = activeFeature === 'tasks';

  return (
    <Card className={cn('border-dashed', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">Events at a glance</CardTitle>
            <CardDescription>
              Keep context and scheduled work together without mixing their intent.
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            Shared timeline
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2">
          <section
            className={cn(
              'rounded-lg border px-3 py-2',
              isNotesActive &&
                'border-amber-300 bg-amber-50/70 dark:border-amber-400/40 dark:bg-amber-500/10'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                <h3 className="text-sm font-semibold">Notes</h3>
              </div>
              <FeatureHelpPopover
                label="Notes details"
                title="Use Notes for long-term context"
                description="Notes are best when you want searchable history and optional photo records."
                items={noteDetails}
                className="h-6 w-6"
              />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Log context, observations, and photo-backed history.
            </p>
          </section>

          <section
            className={cn(
              'rounded-lg border px-3 py-2',
              isTasksActive &&
                'border-blue-300 bg-blue-50/70 dark:border-blue-400/40 dark:bg-blue-500/10'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                <h3 className="text-sm font-semibold">Tasks</h3>
              </div>
              <FeatureHelpPopover
                label="Tasks details"
                title="Use Tasks for scheduled work"
                description="Tasks are best for work that needs due dates, priority, and routine cadence."
                items={taskDetails}
                className="h-6 w-6"
              />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedule care actions with due dates, priority, and recurrence.
            </p>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
