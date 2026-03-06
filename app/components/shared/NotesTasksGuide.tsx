import { Link } from 'react-router';
import { CheckSquare, StickyNote } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

interface NotesTasksGuideProps {
  activeFeature: 'notes' | 'tasks';
  className?: string;
}

const notesBullets = [
  'Capture observations, issues, milestones, and context you want to find later.',
  'Add photos and backdate entries when logging after the fact.',
  'Attach to a plant or space for easier filtering and search.',
];

const tasksBullets = [
  'Plan work that must happen on a date, like transplanting or feeding.',
  'Set priority and optionally repeat tasks for routine maintenance.',
  'Use completion notes to capture outcomes once the task is done.',
];

export function NotesTasksGuide({ activeFeature, className }: NotesTasksGuideProps) {
  const isNotesActive = activeFeature === 'notes';
  const isTasksActive = activeFeature === 'tasks';

  return (
    <Card className={cn('border-dashed', className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">When to use Notes vs Tasks</CardTitle>
            <CardDescription>
              Notes capture what happened. Tasks plan what needs to happen.
            </CardDescription>
          </div>
          <Badge variant="outline">Shared history workflow</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <section
            className={cn(
              'rounded-lg border p-4',
              isNotesActive && 'border-amber-300 bg-amber-50/70'
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-700" />
              <h3 className="text-sm font-semibold">Use Notes when you are logging context</h3>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {notesBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section
            className={cn(
              'rounded-lg border p-4',
              isTasksActive && 'border-blue-300 bg-blue-50/70'
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-blue-700" />
              <h3 className="text-sm font-semibold">Use Tasks when work is scheduled</h3>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {tasksBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <p className="text-sm text-muted-foreground">
          Completed tasks can create linked notes, so your schedule and long-term records stay connected.
        </p>

        {isNotesActive ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/tasks">Need scheduling? Open Tasks</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to="/notes">Need a long-term log? Open Notes</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
