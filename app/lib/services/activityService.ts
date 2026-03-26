import type {
  Activity,
  ActivityFilters,
  ActivityType,
} from '../types/activity';
import type { Note } from '../types/note';
import type { Task } from '../types';
import type { Plant } from '../types';
import type { GrowSpace } from '../types';
import { formatPlantDisplayName } from '../utils/plantDisplay';

/**
 * Activity Service
 *
 * Aggregates activities from existing data sources (notes, tasks, plants, spaces)
 * rather than maintaining a separate activities collection in Firestore.
 */
export class ActivityService {
  /**
   * Generate activities from user data
   */
  generateActivities(
    notes: Note[],
    tasks: Task[],
    plants: Plant[],
    spaces: GrowSpace[],
    filters?: ActivityFilters
  ): Activity[] {
    const activities: Activity[] = [];
    const fallbackUserId =
      notes[0]?.userId ||
      tasks[0]?.userId ||
      plants[0]?.userId ||
      spaces[0]?.userId ||
      'unknown';

    // Generate note activities
    notes.forEach((note) => {
      const plant = note.plantId
        ? plants.find((p) => p.id === note.plantId)
        : undefined;
      const space = note.spaceId
        ? spaces.find((s) => s.id === note.spaceId)
        : undefined;

      activities.push({
        id: `note-${note.id}`,
        userId: note.userId ?? fallbackUserId,
        type: 'note_created',
        timestamp: note.createdAt,
        isPublic: true, // Notes are public for now
        data: {
          noteId: note.id,
          content: note.content.slice(0, 150), // Truncate for preview
          category: note.category,
          plantId: note.plantId,
          spaceId: note.spaceId,
          plantName: plant?.name,
          spaceName: space?.name,
        },
      });
    });

    // Generate task completion activities
    tasks
      .filter((task) => task.status === 'completed' && task.completedAt)
      .forEach((task) => {
        const plant = task.plantId
          ? plants.find((p) => p.id === task.plantId)
          : undefined;
        const space = task.spaceId
          ? spaces.find((s) => s.id === task.spaceId)
          : undefined;

        activities.push({
          id: `task-${task.id}`,
          userId: task.userId ?? fallbackUserId,
          type: 'task_completed',
          timestamp: task.completedAt!,
          isPublic: true,
          data: {
            taskId: task.id,
            title: task.title,
            plantId: task.plantId,
            spaceId: task.spaceId,
            plantName: plant?.name,
            spaceName: space?.name,
          },
        });
      });

    // Generate plant added activities
    plants.forEach((plant) => {
      const space = plant.spaceId
        ? spaces.find((s) => s.id === plant.spaceId)
        : undefined;

      activities.push({
        id: `plant-added-${plant.id}`,
        userId: plant.userId ?? fallbackUserId,
        type: 'plant_added',
        timestamp: plant.createdAt,
        isPublic: true,
        data: {
          plantId: plant.id,
          plantName: plant.name,
          variety: plant.variety,
          spaceId: plant.spaceId,
          spaceName: space?.name,
        },
      });

      // Generate harvest activity if plant is harvested
      if (plant.status === 'harvested' && plant.actualHarvestDate) {
        activities.push({
          id: `plant-harvested-${plant.id}`,
          userId: plant.userId ?? fallbackUserId,
          type: 'plant_harvested',
          timestamp: plant.actualHarvestDate,
          isPublic: true,
          data: {
            plantId: plant.id,
            plantName: plant.name,
            variety: plant.variety,
            harvestDate: plant.actualHarvestDate,
            notes: plant.notes,
          },
        });
      }
    });

    // Generate space creation activities
    spaces.forEach((space) => {
      activities.push({
        id: `space-${space.id}`,
        userId: space.userId ?? fallbackUserId,
        type: 'space_created',
        timestamp: space.createdAt,
        isPublic: true,
        data: {
          spaceId: space.id,
          spaceName: space.name,
          spaceType: space.type,
        },
      });
    });

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply filters
    let filtered = activities;

    if (filters?.types && filters.types.length > 0) {
      filtered = filtered.filter((activity) =>
        filters.types!.includes(activity.type)
      );
    }

    if (filters?.publicOnly) {
      filtered = filtered.filter((activity) => activity.isPublic);
    }

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    if (filters?.plantId) {
      filtered = filtered.filter((activity) => {
        if (activity.type === 'note_created') {
          return activity.data.plantId === filters.plantId;
        }
        if (activity.type === 'task_completed') {
          return activity.data.plantId === filters.plantId;
        }
        if (
          activity.type === 'plant_added' ||
          activity.type === 'plant_harvested' ||
          activity.type === 'plant_status_changed'
        ) {
          return activity.data.plantId === filters.plantId;
        }
        return false;
      });
    }

    if (filters?.spaceId) {
      filtered = filtered.filter((activity) => {
        if (activity.type === 'space_created') {
          return activity.data.spaceId === filters.spaceId;
        }
        if (
          activity.type === 'note_created' ||
          activity.type === 'task_completed' ||
          activity.type === 'plant_added'
        ) {
          return activity.data.spaceId === filters.spaceId;
        }
        return false;
      });
    }

    return filtered;
  }

  /**
   * Format activity description for display
   * @todo: brainstorm if there is a better way to determine "a" or "an"
   */
  formatActivityDescription(activity: Activity): string {
    switch (activity.type) {
      case 'note_created':
        if (activity.data.plantName) {
          return `Added a(n) ${activity.data.category} note for ${activity.data.plantName}`;
        }
        if (activity.data.spaceName) {
          return `Added a(n) ${activity.data.category} note for ${activity.data.spaceName}`;
        }
        return `Added a(n) ${activity.data.category} note`;

      case 'task_completed':
        return `Completed task: ${activity.data.title}`;

      case 'plant_added':
        return activity.data.variety
          ? `Added ${formatPlantDisplayName({
              name: activity.data.plantName,
              variety: activity.data.variety,
            })}`
          : `Added ${activity.data.plantName}`;

      case 'plant_harvested':
        return `Harvested ${activity.data.plantName}`;

      case 'plant_status_changed':
        return `${activity.data.plantName} status changed to ${activity.data.newStatus}`;

      case 'space_created':
        return `Created new ${activity.data.spaceType} space: ${activity.data.spaceName}`;

      default:
        return 'Unknown activity';
    }
  }

  /**
   * Get icon name for activity type
   */
  getActivityIcon(type: ActivityType): string {
    switch (type) {
      case 'note_created':
        return 'StickyNote';
      case 'task_completed':
        return 'CheckCircle2';
      case 'plant_added':
        return 'Sprout';
      case 'plant_harvested':
        return 'Sparkles';
      case 'plant_status_changed':
        return 'TrendingUp';
      case 'space_created':
        return 'Building2';
      default:
        return 'Activity';
    }
  }
}

export const activityService = new ActivityService();
