import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Search, Sprout } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { PlantCard } from './PlantCard';
import { PlantForm } from './PlantForm';
import { MoveDialog } from './MoveDialog';
import { HarvestDialog } from './HarvestDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import type { Plant, GrowSpace, PlantStatus } from '../../lib/types';
import { usePlantStore } from '../../stores/plantStore';
import { useAuthStore } from '../../stores/authStore';
import { noteService } from '../../lib/services/noteService';

interface PlantListProps {
  spaceId?: string;
  spaces: GrowSpace[];
  showAddButton?: boolean;
}

type PlantStatusFilter = PlantStatus | 'active' | 'all';

const parseStatusFilter = (value: string | null): PlantStatusFilter => {
  if (!value) return 'all';

  if (
    value === 'all' ||
    value === 'active' ||
    value === 'seedling' ||
    value === 'vegetative' ||
    value === 'flowering' ||
    value === 'harvested' ||
    value === 'removed'
  ) {
    return value;
  }

  return 'all';
};

export function PlantList({ spaceId, spaces, showAddButton = true }: PlantListProps) {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlantStatusFilter>(() =>
    parseStatusFilter(searchParams.get('status'))
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [movingPlant, setMovingPlant] = useState<Plant | null>(null);
  const [harvestingPlant, setHarvestingPlant] = useState<Plant | null>(null);
  const [noteCountsByPlant, setNoteCountsByPlant] = useState<Record<string, number>>({});

  const { user } = useAuthStore();
  const { plants, loading, error, loadPlants, getPlantsBySpace } = usePlantStore();

  useEffect(() => {
    loadPlants(spaceId);
  }, [spaceId, loadPlants]);

  useEffect(() => {
    if (!user) {
      setNoteCountsByPlant({});
      return;
    }

    const unsubscribe = noteService.subscribe(user.uid, (notes) => {
      const counts: Record<string, number> = {};
      notes.forEach((note) => {
        if (!note.plantId) return;
        counts[note.plantId] = (counts[note.plantId] || 0) + 1;
      });
      setNoteCountsByPlant(counts);
    });

    return unsubscribe;
  }, [user]);

  const displayPlants = spaceId ? getPlantsBySpace(spaceId) : plants;

  const filteredPlants = displayPlants.filter((plant) => {
    const plantVariety = plant.variety?.toLowerCase() ?? '';
    const matchesSearch =
      plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plantVariety.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
          ? plant.status !== 'harvested' && plant.status !== 'removed'
          : plant.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleAddSuccess = () => {
    setShowAddDialog(false);
    loadPlants(spaceId);
  };

  const handleEditSuccess = () => {
    setEditingPlant(null);
    loadPlants(spaceId);
  };

  const handleMoveSuccess = () => {
    setMovingPlant(null);
    loadPlants(spaceId);
  };

  const handleHarvestSuccess = () => {
    setHarvestingPlant(null);
    loadPlants(spaceId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => loadPlants(spaceId)} className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="e2e-plants-list">
      {/* Header with filters and add button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search plants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              data-testid="e2e-plants-search-input"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as PlantStatusFilter)}
          >
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="e2e-plants-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="seedling">Seedling</SelectItem>
              <SelectItem value="vegetative">Vegetative</SelectItem>
              <SelectItem value="flowering">Flowering</SelectItem>
              <SelectItem value="harvested">Harvested</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showAddButton && (
          <Button onClick={() => setShowAddDialog(true)} data-testid="e2e-plants-add-button">
            <Sprout className="mr-2 h-4 w-4" />
            Add Plant
          </Button>
        )}
      </div>

      {/* Plants grid */}
      {filteredPlants.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 text-muted-foreground mb-4 flex items-center justify-center">
            <Sprout className="h-10 w-10" />
          </div>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all'
              ? 'No plants match your filters.'
              : spaceId
                ? 'No plants in this space yet.'
                : 'No plants added yet.'}
          </p>
          {showAddButton && !searchTerm && statusFilter === 'all' && (
            <Button onClick={() => setShowAddDialog(true)} className="mt-2">
              <Sprout className="mr-2 h-4 w-4" />
              Add Your First Plant
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="e2e-plants-grid">
          {filteredPlants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              noteCount={noteCountsByPlant[plant.id] || 0}
              onEdit={setEditingPlant}
              onMove={setMovingPlant}
              onHarvest={setHarvestingPlant}
            />
          ))}
        </div>
      )}

      {/* Add Plant Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Plant</DialogTitle>
          </DialogHeader>
          <PlantForm
            spaces={spaces}
            defaultSpaceId={spaceId}
            onSuccess={handleAddSuccess}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Plant Dialog */}
      <Dialog open={!!editingPlant} onOpenChange={() => setEditingPlant(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plant</DialogTitle>
          </DialogHeader>
          {editingPlant && (
            <PlantForm
              plant={editingPlant}
              spaces={spaces}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingPlant(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Move Plant Dialog */}
      {movingPlant && (
        <MoveDialog
          plant={movingPlant}
          spaces={spaces}
          onSuccess={handleMoveSuccess}
          onCancel={() => setMovingPlant(null)}
        />
      )}

      {/* Harvest Plant Dialog */}
      {harvestingPlant && (
        <HarvestDialog
          plant={harvestingPlant}
          onSuccess={handleHarvestSuccess}
          onCancel={() => setHarvestingPlant(null)}
        />
      )}
    </div>
  );
}
