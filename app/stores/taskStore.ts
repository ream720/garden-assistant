import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Task } from '../lib/types';
import { taskService } from '../lib/services/taskService';
import { useAuthStore } from './authStore';
import { isAfter, startOfDay } from 'date-fns';

interface TaskState {
  tasks: Task[];
  selectedTask: Task | null;
  loading: boolean;
  error: string | null;
  
  // Filters
  filterStatus: 'all' | 'pending' | 'completed';
  filterPriority: 'all' | 'low' | 'medium' | 'high';
  filterSpaceId: string | null;
  filterPlantId: string | null;
  
  // Actions
  loadTasks: () => Promise<void>;
  loadSpaceTasks: (spaceId: string) => Promise<void>;
  loadPlantTasks: (plantId: string) => Promise<void>;
  createTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  selectTask: (task: Task | null) => void;
  
  // Filters
  setFilterStatus: (status: 'all' | 'pending' | 'completed') => void;
  setFilterPriority: (priority: 'all' | 'low' | 'medium' | 'high') => void;
  setFilterSpace: (spaceId: string | null) => void;
  setFilterPlant: (plantId: string | null) => void;
  clearFilters: () => void;
  
  // Computed getters
  getFilteredTasks: () => Task[];
  getOverdueTasks: () => Task[];
  getUpcomingTasks: (days?: number) => Task[];
  getTasksBySpace: (spaceId: string) => Task[];
  getTasksByPlant: (plantId: string) => Task[];
  
  // Utility
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>()(
  subscribeWithSelector((set, get) => ({
    tasks: [],
    selectedTask: null,
    loading: false,
    error: null,
    
    // Filters
    filterStatus: 'all',
    filterPriority: 'all',
    filterSpaceId: null,
    filterPlantId: null,

    loadTasks: async () => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      set({ loading: true, error: null });
      try {
        const result = await taskService.getUserTasks(user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
        } else {
          set({ tasks: result.data || [], loading: false });
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
        set({ 
          tasks: [],
          error: 'Unable to load tasks. You can still create new tasks.',
          loading: false 
        });
      }
    },

    loadSpaceTasks: async (spaceId) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      set({ loading: true, error: null });
      try {
        const result = await taskService.getSpaceTasks(spaceId, user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
        } else {
          set({ tasks: result.data || [], loading: false });
        }
      } catch (error) {
        console.error('Failed to load space tasks:', error);
        set({ 
          tasks: [],
          error: 'Unable to load space tasks.',
          loading: false 
        });
      }
    },

    loadPlantTasks: async (plantId) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      set({ loading: true, error: null });
      try {
        const result = await taskService.getPlantTasks(plantId, user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
        } else {
          set({ tasks: result.data || [], loading: false });
        }
      } catch (error) {
        console.error('Failed to load plant tasks:', error);
        set({ 
          tasks: [],
          error: 'Unable to load plant tasks.',
          loading: false 
        });
      }
    },

    createTask: async (taskData) => {
      set({ loading: true, error: null });
      try {
        const result = await taskService.createTask(taskData);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        } else {
          const newTask = result.data!;
          set(state => ({ 
            tasks: [...state.tasks, newTask],
            loading: false 
          }));
          return newTask;
        }
      } catch (error) {
        console.error('Failed to create task:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
        set({ error: errorMessage, loading: false });
        throw error;
      }
    },

    updateTask: async (id, updates) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        throw new Error('User not authenticated');
      }

      set({ loading: true, error: null });
      try {
        const result = await taskService.updateTask(id, updates, user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        } else {
          const updatedTask = result.data!;
          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === id ? updatedTask : task
            ),
            selectedTask: state.selectedTask?.id === id ? updatedTask : state.selectedTask,
            loading: false
          }));
        }
      } catch (error) {
        console.error('Failed to update task:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update task',
          loading: false 
        });
        throw error;
      }
    },

    completeTask: async (id) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        throw new Error('User not authenticated');
      }

      set({ loading: true, error: null });
      try {
        const result = await taskService.completeTask(id, user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        } else {
          const completedTask = result.data!;

          const refreshedResult = await taskService.getUserTasks(user.uid);
          if (refreshedResult.data) {
            set(state => {
              const selectedTaskId = state.selectedTask?.id;
              const refreshedSelectedTask = selectedTaskId
                ? refreshedResult.data!.find(task => task.id === selectedTaskId) ?? null
                : null;

              return {
                tasks: refreshedResult.data!,
                selectedTask: refreshedSelectedTask,
                loading: false,
              };
            });
            return;
          }

          if (refreshedResult.error) {
            console.warn(
              'Task completion refresh failed; using local fallback state:',
              refreshedResult.error.message
            );
          }

          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === id ? completedTask : task
            ),
            selectedTask: state.selectedTask?.id === id ? completedTask : state.selectedTask,
            loading: false
          }));
        }
      } catch (error) {
        console.error('Failed to complete task:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to complete task',
          loading: false 
        });
        throw error;
      }
    },

    deleteTask: async (id) => {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ error: 'User not authenticated', loading: false });
        throw new Error('User not authenticated');
      }

      set({ loading: true, error: null });
      try {
        const result = await taskService.deleteTask(id, user.uid);
        if (result.error) {
          set({ error: result.error.message, loading: false });
          throw new Error(result.error.message);
        } else {
          set(state => ({
            tasks: state.tasks.filter(task => task.id !== id),
            selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
            loading: false
          }));
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete task',
          loading: false 
        });
        throw error;
      }
    },

    selectTask: (task) => {
      set({ selectedTask: task });
    },

    // Filters
    setFilterStatus: (status) => {
      set({ filterStatus: status });
    },

    setFilterPriority: (priority) => {
      set({ filterPriority: priority });
    },

    setFilterSpace: (spaceId) => {
      set({ filterSpaceId: spaceId });
    },

    setFilterPlant: (plantId) => {
      set({ filterPlantId: plantId });
    },

    clearFilters: () => {
      set({
        filterStatus: 'all',
        filterPriority: 'all',
        filterSpaceId: null,
        filterPlantId: null
      });
    },

    // Computed getters
    getFilteredTasks: () => {
      const state = get();
      let filtered = [...state.tasks];

      // Filter by status
      if (state.filterStatus !== 'all') {
        filtered = filtered.filter(task => task.status === state.filterStatus);
      }

      // Filter by priority
      if (state.filterPriority !== 'all') {
        filtered = filtered.filter(task => task.priority === state.filterPriority);
      }

      // Filter by space
      if (state.filterSpaceId) {
        filtered = filtered.filter(task => task.spaceId === state.filterSpaceId);
      }

      // Filter by plant
      if (state.filterPlantId) {
        filtered = filtered.filter(task => task.plantId === state.filterPlantId);
      }

      return filtered;
    },

    getOverdueTasks: () => {
      const today = startOfDay(new Date());
      return get().tasks.filter(task => 
        task.status === 'pending' && isAfter(today, task.dueDate)
      );
    },

    getUpcomingTasks: (days = 7) => {
      const today = startOfDay(new Date());
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);
      
      return get().tasks.filter(task => 
        task.status === 'pending' && 
        task.dueDate >= today && 
        task.dueDate <= futureDate
      );
    },

    getTasksBySpace: (spaceId) => {
      return get().tasks.filter(task => task.spaceId === spaceId);
    },

    getTasksByPlant: (plantId) => {
      return get().tasks.filter(task => task.plantId === plantId);
    },

    setError: (error) => {
      set({ error });
    },

    clearError: () => {
      set({ error: null });
    }
  }))
);
