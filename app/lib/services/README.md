# Core Data Services

This directory contains the core data services for the GROSPACE application, providing a clean abstraction layer over Firebase Firestore operations.

## Architecture

### BaseService
The `BaseService` class provides common CRUD operations and error handling for all Firestore collections:

- **create()** - Create new documents with automatic timestamps
- **getById()** - Retrieve documents by ID (user-scoped for domain collections)
- **update()** - Update documents with automatic timestamp updates (user-scoped for domain collections)
- **delete()** - Delete documents (user-scoped for domain collections)
- **list()** - Query documents with filters and sorting (user-scoped for domain collections)
- **subscribe()** - Real-time subscriptions to document changes
- **subscribeToDocument()** - Real-time subscriptions to single documents

### Error Handling
All services return a consistent `ServiceResult<T>` format:
```typescript
interface ServiceResult<T> {
  data?: T;
  error?: ServiceError;
}
```

Firebase errors are automatically converted to user-friendly error messages with appropriate error codes.

## Services

### SpaceService
Manages grow spaces (gardens, tents, greenhouses, etc.):

```typescript
import { spaceService } from './services';

// Create a new space
const result = await spaceService.createSpace({
  userId: 'user123',
  name: 'My Garden',
  type: 'outdoor-bed',
  description: 'A beautiful outdoor garden'
});

// Get all spaces for a user
const spaces = await spaceService.getUserSpaces('user123');

// Subscribe to real-time updates
const unsubscribe = spaceService.subscribeToUserSpaces('user123', (result) => {
  if (result.data) {
    console.log('Spaces updated:', result.data);
  }
});
```

### PlantService
Manages plants within spaces:

```typescript
import { plantService } from './services';

// Add a plant to a space
const result = await plantService.createPlant({
  spaceId: 'space123',
  userId: 'user123',
  name: 'Tomato Plant',
  variety: 'Cherry Tomato',
  plantedDate: new Date(),
  seedSource: 'Local Store'
});

// Get plants in a space
const plants = await plantService.getSpacePlants('space123', 'user123');

// Move a plant to another space
await plantService.movePlant('plant123', {
  newSpaceId: 'space456',
  notes: 'Moved to greenhouse for better conditions'
}, 'user123');

// Harvest a plant
await plantService.harvestPlant('plant123', new Date(), 'user123', 'Great harvest!');
```

## Features

### Validation
All services include comprehensive input validation:
- Required field validation
- Data type validation
- Business rule validation (e.g., can't delete spaces with plants)

### Real-time Updates
Services support real-time subscriptions using Firestore's `onSnapshot`:
- Automatic UI updates when data changes
- Efficient bandwidth usage with incremental updates
- Automatic error handling and reconnection

### Relationship Management
Services automatically manage relationships between entities:
- Plant counts are updated when plants are added/removed/moved
- Referential integrity is maintained
- Cascade operations where appropriate

### Loading States
All operations return consistent result objects that can be used to manage loading states in the UI.

## Usage with Zustand Stores

These services are designed to work seamlessly with Zustand stores for state management:

```typescript
// In a Zustand store
const useSpaceStore = create<SpaceStore>((set, get) => ({
  spaces: [],
  loading: false,
  error: null,

  loadSpaces: async (userId: string) => {
    set({ loading: true, error: null });
    const result = await spaceService.getUserSpaces(userId);
    
    if (result.error) {
      set({ loading: false, error: result.error.message });
    } else {
      set({ loading: false, spaces: result.data || [] });
    }
  },

  subscribeToSpaces: (userId: string) => {
    return spaceService.subscribeToUserSpaces(userId, (result) => {
      if (result.error) {
        set({ error: result.error.message });
      } else {
        set({ spaces: result.data || [], error: null });
      }
    });
  }
}));
```

## Testing

The services include comprehensive test coverage:
- Unit tests for all methods
- Validation testing
- Error handling testing
- Integration tests

Run tests with:
```bash
npm run test app/test/services
```
