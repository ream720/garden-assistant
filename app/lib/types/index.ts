import type { FirestoreDocument } from '../firebase/firestore';

// Re-export auth types
export * from './auth';

// User types
export interface User {
  uid: string;
  email: string;
  displayName: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  defaultUnits: 'metric' | 'imperial';
  timezone: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  taskReminders: boolean;
}

// Grow Space types
export type SpaceType = 'indoor-tent' | 'outdoor-bed' | 'greenhouse' | 'hydroponic' | 'container';

export interface GrowSpace extends FirestoreDocument {
  userId: string;
  name: string;
  type: SpaceType;
  description?: string;
  dimensions?: SpaceDimensions;
  environment?: EnvironmentSettings;
  plantCount: number;
}

export interface SpaceDimensions {
  length: number;
  width: number;
  height?: number;
  unit: 'cm' | 'inches' | 'feet';
}

export interface EnvironmentSettings {
  temperature?: TemperatureRange;
  humidity?: HumidityRange;
  lightSchedule?: LightSchedule;
}

export interface TemperatureRange {
  min: number;
  max: number;
  unit: 'celsius' | 'fahrenheit';
}

export interface HumidityRange {
  min: number;
  max: number;
}

export interface LightSchedule {
  hoursOn: number;
  hoursOff: number;
}

// Plant types
export type PlantStatus = 'seedling' | 'vegetative' | 'flowering' | 'harvested' | 'removed';

export interface Plant extends FirestoreDocument {
  spaceId: string;
  userId: string;
  name: string;
  variety?: string;
  seedSource?: string;
  plantedDate: Date;
  expectedHarvestDate?: Date;
  actualHarvestDate?: Date;
  status: PlantStatus;
  notes?: string;
}

// Note types
export type NoteCategory = 'observation' | 'feeding' | 'pruning' | 'issue' | 'milestone' | 'general';

export interface Note extends FirestoreDocument {
  userId: string;
  plantId?: string;
  spaceId?: string;
  content: string;
  category: NoteCategory;
  photos: string[];
  timestamp: Date;
}

// Task types
export type TaskStatus = 'pending' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task extends FirestoreDocument {
  userId: string;
  plantId?: string;
  spaceId?: string;
  title: string;
  description?: string;
  dueDate: Date;
  priority: TaskPriority;
  status: TaskStatus;
  recurrence?: RecurrenceSettings;
  completedAt?: Date;
}

export interface RecurrenceSettings {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: Date;
}
