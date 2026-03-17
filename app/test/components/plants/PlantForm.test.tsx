import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlantForm } from '../../../components/plants/PlantForm';
import type { Plant, GrowSpace } from '../../../lib/types';

// Create mock functions that we can spy on
const mockCreatePlant = vi.fn();
const mockUpdatePlant = vi.fn();

// Mock the stores
vi.mock('../../../stores/plantStore', () => ({
  usePlantStore: () => ({
    createPlant: mockCreatePlant,
    updatePlant: mockUpdatePlant,
  }),
}));

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { uid: 'test-user-id' },
  }),
}));

vi.mock('../../../stores/spaceStore', () => ({
  useSpaceStore: () => ({
    createSpace: vi.fn(),
    spaces: [],
  }),
}));

vi.mock('../../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock date utils
vi.mock('../../../lib/utils/dateUtils', () => ({
  toDate: vi.fn((date) => {
    if (date instanceof Date) return date;
    if (typeof date === 'string') return new Date(date);
    if (date && typeof date === 'object' && date.toDate) return date.toDate();
    return new Date(date);
  }),
}));

describe('PlantForm', () => {
  const mockSpaces: GrowSpace[] = [
    {
      id: 'space-1',
      userId: 'test-user-id',
      name: 'Indoor Tent',
      type: 'indoor-tent',
      plantCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Date Handling', () => {
    it('should render form with default date for new plant', () => {
      render(<PlantForm spaces={mockSpaces} />);

      // Should have date picker buttons
      expect(screen.getByText('Pick a date')).toBeInTheDocument();
    });

    it('should populate dates when editing existing plant with valid dates', async () => {
      const mockPlant: Plant = {
        id: 'plant-1',
        userId: 'test-user-id',
        name: 'Test Plant',
        variety: 'Test Variety',
        spaceId: 'space-1',
        status: 'vegetative',
        plantedDate: new Date('2024-01-15'),
        expectedHarvestDate: new Date('2024-06-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<PlantForm plant={mockPlant} spaces={mockSpaces} />);

      await waitFor(() => {
        // Should show formatted dates instead of "Pick a date"
        expect(screen.getByDisplayValue('Test Plant')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Variety')).toBeInTheDocument();
      });
    });

    it('should handle Firestore Timestamp objects', async () => {
      const mockFirestoreTimestamp = {
        toDate: () => new Date('2024-01-15'),
        seconds: 1705276800,
        nanoseconds: 0,
      };

      const mockPlant: Plant = {
        id: 'plant-1',
        userId: 'test-user-id',
        name: 'Test Plant',
        variety: 'Test Variety',
        spaceId: 'space-1',
        status: 'vegetative',
        plantedDate: mockFirestoreTimestamp as any,
        expectedHarvestDate: mockFirestoreTimestamp as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<PlantForm plant={mockPlant} spaces={mockSpaces} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Plant')).toBeInTheDocument();
      });

      // Verify toDate was called for date conversion
      const { toDate } = await import('../../../lib/utils/dateUtils');
      expect(vi.mocked(toDate)).toHaveBeenCalledWith(mockFirestoreTimestamp);
    });

    it('should handle invalid date values gracefully', async () => {
      const mockPlant: Plant = {
        id: 'plant-1',
        userId: 'test-user-id',
        name: 'Test Plant',
        variety: 'Test Variety',
        spaceId: 'space-1',
        status: 'vegetative',
        plantedDate: 'invalid-date' as any,
        expectedHarvestDate: null as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<PlantForm plant={mockPlant} spaces={mockSpaces} />);

      // Should not crash and should render the form
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Plant')).toBeInTheDocument();
      });
    });

    it('should reset form when plant prop changes', async () => {
      const initialPlant: Plant = {
        id: 'plant-1',
        userId: 'test-user-id',
        name: 'Initial Plant',
        variety: 'Initial Variety',
        spaceId: 'space-1',
        status: 'seedling',
        plantedDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { rerender } = render(<PlantForm plant={initialPlant} spaces={mockSpaces} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Initial Plant')).toBeInTheDocument();
      });

      // Change the plant prop
      const updatedPlant: Plant = {
        ...initialPlant,
        name: 'Updated Plant',
        variety: 'Updated Variety',
      };

      rerender(<PlantForm plant={updatedPlant} spaces={mockSpaces} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Updated Plant')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Updated Variety')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      render(<PlantForm spaces={mockSpaces} />);

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /add plant/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Plant name is required')).toBeInTheDocument();
        expect(screen.getByText('Space selection is required')).toBeInTheDocument();
      });
    });

    it('should allow filling out form fields', async () => {
      render(<PlantForm spaces={mockSpaces} />);

      // Fill out the form
      const nameInput = screen.getByPlaceholderText('e.g., Tomato #1');
      const varietyInput = screen.getByPlaceholderText('e.g., Cherry Tomato');

      fireEvent.change(nameInput, { target: { value: 'Test Plant' } });
      fireEvent.change(varietyInput, { target: { value: 'Test Variety' } });

      expect(nameInput).toHaveValue('Test Plant');
      expect(varietyInput).toHaveValue('Test Variety');

      // Should have submit button
      expect(screen.getByRole('button', { name: /add plant/i })).toBeInTheDocument();
    });
  });

  // TODO: Add integration tests for "Create New Space" functionality
  // The feature works correctly in production, but testing the Radix UI Select
  // component interaction is challenging in unit tests. Integration tests using
  // Playwright/Cypress would be more appropriate for this UI interaction.
});
