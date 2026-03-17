export type ActivityType =
  | 'note_created'
  | 'task_completed'
  | 'plant_added'
  | 'plant_harvested'
  | 'plant_status_changed'
  | 'space_created';

export interface BaseActivity {
  id: string;
  userId: string;
  type: ActivityType;
  timestamp: Date;
  isPublic: boolean;
}

export interface NoteCreatedActivity extends BaseActivity {
  type: 'note_created';
  data: {
    noteId: string;
    content: string;
    category: string;
    plantId?: string;
    spaceId?: string;
    plantName?: string;
    spaceName?: string;
  };
}

export interface TaskCompletedActivity extends BaseActivity {
  type: 'task_completed';
  data: {
    taskId: string;
    title: string;
    plantId?: string;
    spaceId?: string;
    plantName?: string;
    spaceName?: string;
  };
}

export interface PlantAddedActivity extends BaseActivity {
  type: 'plant_added';
  data: {
    plantId: string;
    plantName: string;
    variety?: string;
    spaceId?: string;
    spaceName?: string;
  };
}

export interface PlantHarvestedActivity extends BaseActivity {
  type: 'plant_harvested';
  data: {
    plantId: string;
    plantName: string;
    variety?: string;
    harvestDate: Date;
    notes?: string;
  };
}

export interface PlantStatusChangedActivity extends BaseActivity {
  type: 'plant_status_changed';
  data: {
    plantId: string;
    plantName: string;
    oldStatus: string;
    newStatus: string;
  };
}

export interface SpaceCreatedActivity extends BaseActivity {
  type: 'space_created';
  data: {
    spaceId: string;
    spaceName: string;
    spaceType: string;
  };
}

export type Activity =
  | NoteCreatedActivity
  | TaskCompletedActivity
  | PlantAddedActivity
  | PlantHarvestedActivity
  | PlantStatusChangedActivity
  | SpaceCreatedActivity;

export interface ActivityFilters {
  types?: ActivityType[];
  limit?: number;
  publicOnly?: boolean;
  plantId?: string;
  spaceId?: string;
}
