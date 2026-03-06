import type { Route } from './+types/tasks';
import { TasksPage } from '../components/tasks/TasksPage';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { NotesTasksGuide } from '../components/shared/NotesTasksGuide';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Tasks - Grospace' },
    { name: 'description', content: 'Manage your garden tasks and schedules' },
  ];
}

function TasksContent() {
  return (
    <DashboardLayout title="Tasks">
      <div className="space-y-6">
        <NotesTasksGuide activeFeature="tasks" />
        <TasksPage />
      </div>
    </DashboardLayout>
  );
}

export default function Tasks() {
  return (
    <ProtectedRoute>
      <TasksContent />
    </ProtectedRoute>
  );
}
