import { useEffect, useMemo } from 'react';
import type { Route } from "./+types/profile";
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { useAuthStore } from '../stores/authStore';
import { useSpaceStore } from '../stores/spaceStore';
import { usePlantStore } from '../stores/plantStore';
import { useTaskStore } from '../stores/taskStore';
import { useNoteStore } from '../stores/noteStore';
import { UserInfoCard } from '../components/profile/UserInfoCard';
import { GardenStatsCard } from '../components/profile/GardenStatsCard';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { activityService } from '../lib/services/activityService';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Profile - Grospace" },
    { name: "description", content: "Your garden profile" },
  ];
}

function ProfileContent() {
  const { user } = useAuthStore();
  const { spaces, loadSpaces, loading: spacesLoading } = useSpaceStore();
  const { plants, loadPlants, loading: plantsLoading } = usePlantStore();
  const { tasks, loadTasks, loading: tasksLoading } = useTaskStore();
  const { notes, loadNotes, loading: notesLoading } = useNoteStore();

  useEffect(() => {
    if (user) {
      loadSpaces();
      loadPlants();
      loadTasks();
      loadNotes(user.uid, { limit: 20 }); // Load more for profile
    }
  }, [user, loadSpaces, loadPlants, loadTasks, loadNotes]);

  // Generate activity feed (public activities only for profile view)
  const publicActivities = useMemo(() => {
    return activityService.generateActivities(
      notes,
      tasks,
      plants,
      spaces,
      { limit: 15, publicOnly: true }
    );
  }, [notes, tasks, plants, spaces]);

  const isLoading = spacesLoading || plantsLoading || tasksLoading || notesLoading;

  if (!user) {
    return null; // ProtectedRoute will handle redirect
  }

  return (
    <DashboardLayout title="Profile">
      <div className="grid gap-6 lg:grid-cols-3" data-testid="e2e-profile-root">
        {/* Left Column - User Info */}
        <div className="space-y-6">
          <UserInfoCard user={user} />
        </div>

        {/* Middle Column - Garden Stats */}
        <div className="lg:col-span-2 space-y-6">
          <GardenStatsCard
            plants={plants}
            spaces={spaces}
          />

          {/* Public Activity Feed */}
          <ActivityFeed
            activities={publicActivities}
            isLoading={isLoading}
            title="Recent Activity"
            description="Your recent garden activities"
            emptyMessage="No activity yet. Start adding plants and tracking your garden!"
            dataTestId="e2e-profile-activity-card"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
