import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router';
import { MoreHorizontal, Edit, Trash2, Move, Calendar, StickyNote, Eye } from 'lucide-react';
import { formatDateSafe } from '../../lib/utils/dateUtils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import type { Plant } from '../../lib/types';
import { usePlantStore } from '../../stores/plantStore';
import { useSpaceStore } from '../../stores/spaceStore';
import { useAuthStore } from '../../stores/authStore';
import { noteService } from '../../lib/services/noteService';

interface PlantCardProps {
  plant: Plant;
  noteCount?: number;
  onEdit?: (plant: Plant) => void;
  onMove?: (plant: Plant) => void;
  onHarvest?: (plant: Plant) => void;
}

const statusColors = {
  seedling: 'bg-green-100 text-green-800 hover:bg-green-200',
  vegetative: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  flowering: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  harvested: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  removed: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
};

const statusLabels = {
  seedling: 'Seedling',
  vegetative: 'Vegetative',
  flowering: 'Flowering',
  harvested: 'Harvested',
  removed: 'Removed',
};

export function PlantCard({ plant, noteCount, onEdit, onMove, onHarvest }: PlantCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fallbackNoteCount, setFallbackNoteCount] = useState(0);
  const navigate = useNavigate();
  const { deletePlant } = usePlantStore();
  const { spaces } = useSpaceStore();
  const { user } = useAuthStore();

  // Get the space name for this plant
  const spaceName = plant.spaceId ? spaces.find(s => s.id === plant.spaceId)?.name : null;

  // Backward-compatible fallback when noteCount is not provided by parent.
  useEffect(() => {
    if (noteCount !== undefined || !user) return;

    const loadPlantNotes = async () => {
      try {
        const notes = await noteService.list(user.uid, { plantId: plant.id });
        setFallbackNoteCount(notes.length);
      } catch (error) {
        console.error('Failed to load plant notes:', error);
      }
    };

    loadPlantNotes();
  }, [noteCount, user, plant.id]);

  const resolvedNoteCount = noteCount ?? fallbackNoteCount;

  const handleDelete = async () => {
    try {
      await deletePlant(plant.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete plant:', error);
    }
  };

  const daysSincePlanted = formatDateSafe(
    plant.plantedDate,
    (date) => formatDistanceToNow(date, { addSuffix: false }),
    'Unknown'
  );

  const canHarvest = plant.status !== 'harvested' && plant.status !== 'removed';

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <Link to={`/plants/${plant.id}`} className="hover:underline">
                <CardTitle className="text-lg">{plant.name}</CardTitle>
            </Link>
            <p className="text-sm text-muted-foreground">{plant.variety}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={statusColors[plant.status]}>
              {statusLabels[plant.status]}
            </Badge>
            {resolvedNoteCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                {resolvedNoteCount}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/plants/${plant.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(plant)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/events?type=notes&plantId=${plant.id}`)}>
                  <StickyNote className="mr-2 h-4 w-4" />
                  View Events ({resolvedNoteCount})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMove?.(plant)}>
                  <Move className="mr-2 h-4 w-4" />
                  Move to Space
                </DropdownMenuItem>
                {canHarvest && (
                  <DropdownMenuItem onClick={() => onHarvest?.(plant)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Record Harvest
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Planted:</span>
              <span>{formatDateSafe(plant.plantedDate, (date) => format(date, 'MMM d, yyyy'))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Age:</span>
              <span>{daysSincePlanted}</span>
            </div>
            {spaceName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Space:</span>
                <span>{spaceName}</span>
              </div>
            )}
            {plant.expectedHarvestDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected Harvest:</span>
                <span>{formatDateSafe(plant.expectedHarvestDate, (date) => format(date, 'MMM d, yyyy'))}</span>
              </div>
            )}
            {plant.actualHarvestDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Harvested:</span>
                <span>{formatDateSafe(plant.actualHarvestDate, (date) => format(date, 'MMM d, yyyy'))}</span>
              </div>
            )}
            {plant.seedSource && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source:</span>
                <span className="text-right">{plant.seedSource}</span>
              </div>
            )}
            {plant.notes && (
              <div className="mt-3 pt-2 border-t">
                <p className="text-sm text-muted-foreground">{plant.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{plant.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

