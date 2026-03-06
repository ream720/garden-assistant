import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { CheckSquare, StickyNote } from 'lucide-react';

import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { NoteList } from '../components/notes/NoteList';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { EventsGuide } from '../components/shared/EventsGuide';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TasksPage } from '../components/tasks/TasksPage';
import { useAuthStore } from '../stores/authStore';
import { usePlantStore } from '../stores/plantStore';
import { useSpaceStore } from '../stores/spaceStore';

type EventsView = 'notes' | 'tasks';

const parseEventsView = (value: string | null): EventsView => (value === 'tasks' ? 'tasks' : 'notes');

export function meta() {
  return [
    { title: 'Events - Grospace' },
    {
      name: 'description',
      content: 'Manage notes and scheduled tasks together in one Events workspace',
    },
  ];
}

function EventsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = parseEventsView(searchParams.get('type'));

  const { user } = useAuthStore();
  const { loadSpaces } = useSpaceStore();
  const { loadPlants } = usePlantStore();

  useEffect(() => {
    if (!user) return;

    loadSpaces();
    loadPlants();
  }, [user, loadSpaces, loadPlants]);

  const handleViewChange = (value: string) => {
    const nextView = parseEventsView(value);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', nextView);
    setSearchParams(nextParams);
  };

  return (
    <DashboardLayout title="Events">
      <Tabs value={activeView} onValueChange={handleViewChange}>
        <div className="space-y-3">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="notes" className="gap-2">
              <StickyNote className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks
            </TabsTrigger>
          </TabsList>

          <EventsGuide activeFeature={activeView} />
        </div>

        <TabsContent value="notes" className="mt-4">
          <NoteList title="Notes" showDescription={false} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TasksPage embedded compactIntro />
        </TabsContent>
      </Tabs>
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
