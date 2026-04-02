import { SpaceList } from '../components/spaces';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';

export function meta() {
  return [
    { title: "Spaces - Grospace" },
    { name: "description", content: "Manage your growing environments" },
  ];
}

function SpacesContent() {
  return (
    <DashboardLayout title="Grow Spaces">
      <div className="mb-8" data-testid="e2e-spaces-header">
        <p className="text-muted-foreground">
          Manage your growing environments
        </p>
      </div>
      <SpaceList />
    </DashboardLayout>
  );
}

export default function SpacesPage() {
  return (
    <ProtectedRoute>
      <SpacesContent />
    </ProtectedRoute>
  );
}
