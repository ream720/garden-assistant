import { useEffect } from 'react';
import { PlantList } from '../components/plants';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { useAuthStore } from '../stores/authStore';
import { useSpaceStore } from '../stores/spaceStore';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';

export function meta() {
  return [
    { title: "Plants - Grospace" },
    { name: "description", content: "Manage your plants across all spaces" },
  ];
}

function PlantsContent() {
  const { user } = useAuthStore();
  const { spaces, loadSpaces } = useSpaceStore();

  useEffect(() => {
    if (user) {
      loadSpaces();
    }
  }, [user, loadSpaces]);

  return (
    <DashboardLayout title="My Plants">
      <div className="mb-8" data-testid="e2e-plants-header">
        <p className="text-muted-foreground">
          Manage all your plants across different growing spaces
        </p>
      </div>
      <PlantList spaces={spaces} />
    </DashboardLayout>
  );
}

export default function PlantsPage() {
  return (
    <ProtectedRoute>
      <PlantsContent />
    </ProtectedRoute>
  );
}
